#!/usr/bin/env node
// Measures, across local Claude Code and Codex transcripts, how each plugin
// skill came to be loaded and whether it was loaded before the first edit that
// the pre-edit skill check attributes to it.
//
// How a transcript first loaded a skill:
//   model     the agent loaded it unprompted (chosen from its description)
//   explicit  the user typed it as a slash command
//   hook      after the check refused an edit or reminded about it
//   not-loaded  the transcript has a covered edit and never loaded the skill
// For skills with covered edits: edited, loaded before the first edit, loaded
// only later (late). An edit the check refused, or one whose tool reported an
// error, did not happen and is not counted.
//
// Codex rollouts are read from $CODEX_HOME (default ~/.codex) sessions/ and
// archived_sessions/. Their layout was checked against the openai/codex source
// (2026-11-25), not against a real rollout; see VALIDATION.md.
//
// Usage: node scripts/pre-edit-skill-check-stats.mjs [--since YYYY-MM-DD] [--verbose] [--json]
//        [--claude DIR] [--codex DIR]...
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLUGIN, classify, extractEdits, injectedSkills, toolCalls, toolResults, transcriptLoads } from '../plugins/java-engineering-skills/hooks/pre-edit-skill-check.mjs';

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
};
const since = option('--since') ? new Date(option('--since')).getTime() : 0;
const verbose = args.includes('--verbose');
const json = args.includes('--json');
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
const roots = {
  claude: [option('--claude', path.join(os.homedir(), '.claude/projects'))],
  // Codex moves an archived thread's rollout from sessions/ to archived_sessions/.
  codex: option('--codex') ? [option('--codex')] : ['sessions', 'archived_sessions'].map(dir => path.join(codexHome, dir)),
};

// Codex can compress cold rollouts to .jsonl.zst (local_thread_store_compression,
// off by default in the source checked); those are counted and skipped.
let compressed = 0;
function* jsonl(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* jsonl(file);
    else if (entry.name.endsWith('.jsonl.zst')) compressed++;
    else if (entry.name.endsWith('.jsonl') && fs.statSync(file).mtimeMs >= since) yield file;
  }
}

// The check's own refusal and reminder texts (see message() in the hook). In
// Claude Code the refusal is an error tool_result and the reminder a
// hook_additional_context attachment; any record the model did not write is
// scanned, so other layouts that carry the same text count too.
const REFUSAL = new RegExp(`${PLUGIN}: this edit was not applied\\. Load (.*?) now, then retry`, 'g');
const REMINDER = new RegExp(`${PLUGIN}: this edit touches (.*?)\\. If that concern`, 'g');
const NAMED = new RegExp(`\`${PLUGIN}:([a-z-]+)\``, 'g');
const named = (line, pattern) => [...line.matchAll(pattern)].flatMap(match => [...match[1].matchAll(NAMED)].map(name => name[1]));

/**
 * True for records the model wrote: its text, reasoning and tool calls. In Codex
 * a hook's additionalContext is recorded as a developer message, so only
 * assistant messages count as the model's.
 */
function byModel(record) {
  if (record?.type === 'assistant') return true;
  const payload = record?.type === 'response_item' ? record.payload : null;
  if (!payload) return record?.type === 'event_msg' && /^agent_/.test(record.payload?.type || '');
  return payload.type === 'reasoning' || /(^|_)call$/.test(payload.type || '') || (payload.type === 'message' && payload.role === 'assistant');
}

/** Per transcript: skill -> {how, hard, edited, before, late}. */
export function analyze(text) {
  const lines = text.split('\n').filter(Boolean);
  const consume = transcriptLoads();
  const result = new Map();
  const entry = skill => result.get(skill) || result.set(skill, { how: null, hard: null, edited: false, before: false, late: false, file: null }).get(skill);
  // Edits the check refused, or that failed, did not happen; the retry counts.
  const refused = new Set();
  for (const line of lines) {
    for (const item of toolResults(line)) {
      const output = typeof item.output === 'string' ? item.output : JSON.stringify(item.output ?? '');
      if (item.failed || new RegExp(REFUSAL.source).test(output)) refused.add(item.id);
    }
  }
  const asked = new Set();
  for (const line of lines) {
    let record;
    try { record = JSON.parse(line); } catch { continue; }
    if (!byModel(record)) for (const skill of [...named(line, REFUSAL), ...named(line, REMINDER)]) asked.add(skill);
    const injected = injectedSkills(line);
    const explicit = new Set(injected && !injected.toolUseId ? injected.skills : []);
    for (const skill of [...consume(line), ...explicit]) {
      const row = entry(skill);
      if (row.how) continue;
      row.how = explicit.has(skill) ? 'explicit' : asked.has(skill) ? 'hook' : 'model';
      if (row.edited && !row.before) row.late = true;
    }
    for (const { toolName, toolInput, id } of toolCalls(line)) {
      if (refused.has(id)) continue;
      for (const hit of classify(extractEdits(toolName, toolInput))) {
        const row = entry(hit.skill);
        row.hard ||= hit.hard;
        if (row.edited) continue;
        Object.assign(row, { edited: true, before: Boolean(row.how), file: hit.file });
      }
    }
  }
  return result;
}

function report() {
  const rows = new Map();
  const details = [];
  for (const [runtime, dirs] of Object.entries(roots)) for (const dir of dirs) {
    for (const file of jsonl(dir)) {
      for (const [skill, result] of analyze(fs.readFileSync(file, 'utf8'))) {
        const key = `${runtime}\t${skill}`;
        const row = rows.get(key) || { runtime, skill, rule: '-', transcripts: 0, model: 0, explicit: 0, hook: 0, notLoaded: 0, edited: 0, beforeEdit: 0, late: 0 };
        if (result.hard !== null) row.rule = result.hard || row.rule === 'hard' ? 'hard' : 'soft';
        row.transcripts++;
        if (result.how) row[result.how]++; else row.notLoaded++;
        if (result.edited) {
          row.edited++;
          if (result.before) row.beforeEdit++;
          else if (result.late) row.late++;
        }
        rows.set(key, row);
        if (result.edited && !result.before) {
          details.push(`${runtime}  ${skill}  ${result.how || 'not-loaded'}  ${path.relative(dir, file)}  (${path.basename(result.file)})`);
        }
      }
    }
  }
  const sorted = [...rows.values()].sort((a, b) => a.runtime.localeCompare(b.runtime) || b.transcripts - a.transcripts);
  if (compressed) console.error(`Skipped ${compressed} compressed Codex rollout(s) (.jsonl.zst); decompress them with zstd -d to include them.`);
  if (json) return console.log(JSON.stringify(sorted, null, 2));
  console.log('                                              first load                        covered edits');
  console.log('runtime  rule  skill                     transcripts  model explicit  hook not-loaded  edited before-edit  late');
  for (const row of sorted) {
    console.log(`${row.runtime.padEnd(8)} ${row.rule.padEnd(5)} ${row.skill.padEnd(25)} ${String(row.transcripts).padStart(11)} ${String(row.model).padStart(6)} ${String(row.explicit).padStart(8)} ${String(row.hook).padStart(5)} ${String(row.notLoaded).padStart(10)} ${String(row.edited).padStart(7)} ${String(row.beforeEdit).padStart(11)} ${String(row.late).padStart(5)}`);
  }
  if (verbose && details.length) console.log(`\nLoaded after the first covered edit, or never:\n${details.join('\n')}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) report();
