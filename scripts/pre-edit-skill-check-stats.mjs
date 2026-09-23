#!/usr/bin/env node
// Measures whether each plugin skill was loaded before the first edit that the
// pre-edit skill check attributes to it, across local Claude Code and Codex transcripts.
// Usage: node scripts/pre-edit-skill-check-stats.mjs [--since YYYY-MM-DD] [--verbose]
//        [--claude DIR] [--codex DIR]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { classify, extractEdits, transcriptLoads, toolCalls } from '../plugins/java-engineering-skills/hooks/pre-edit-skill-check.mjs';

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
};
const since = option('--since') ? new Date(option('--since')).getTime() : 0;
const verbose = args.includes('--verbose');
const roots = {
  claude: option('--claude', path.join(os.homedir(), '.claude/projects')),
  codex: option('--codex', path.join(os.homedir(), '.codex/sessions')),
};

function* jsonl(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* jsonl(file);
    else if (entry.name.endsWith('.jsonl') && fs.statSync(file).mtimeMs >= since) yield file;
  }
}

/** Per transcript: skill -> {hard, before, after} for skills its edits touched. */
function analyze(text) {
  const loaded = new Set();
  const outcome = new Map();
  const consume = transcriptLoads();
  // Edits the check blocked did not happen; the retry after loading counts.
  const blocked = new Set([...text.matchAll(/"(?:tool_use_id|call_id)"\s*:\s*"([^"]+)"[^\n]*?java-engineering-skills: (?:load |this edit was not applied)/g)].map(match => match[1]));
  for (const line of text.split('\n')) {
    if (!line) continue;
    for (const skill of consume(line)) {
      loaded.add(skill);
      const entry = outcome.get(skill);
      if (entry && !entry.before) entry.after = true;
    }
    for (const { toolName, toolInput, id } of toolCalls(line)) {
      if (blocked.has(id)) continue;
      const hits = classify(extractEdits(toolName, toolInput));
      for (const hit of hits) {
        const entry = outcome.get(hit.skill);
        if (!entry) outcome.set(hit.skill, { hard: hit.hard, before: loaded.has(hit.skill), after: false, file: hit.file });
        else entry.hard ||= hit.hard;
      }
    }
  }
  return outcome;
}

function report() {
  const rows = new Map();
  const misses = [];
  for (const [runtime, dir] of Object.entries(roots)) {
    for (const file of jsonl(dir)) {
      for (const [skill, result] of analyze(fs.readFileSync(file, 'utf8'))) {
        const key = `${runtime}\t${skill}`;
        const row = rows.get(key) || { runtime, skill, hard: false, sessions: 0, before: 0, after: 0, never: 0 };
        row.hard ||= result.hard;
        row.sessions++;
        if (result.before) row.before++;
        else if (result.after) row.after++;
        else row.never++;
        rows.set(key, row);
        if (!result.before) misses.push(`${runtime}  ${skill}  ${result.after ? 'late ' : 'never'}  ${path.relative(dir, file)}  (${path.basename(result.file)})`);
      }
    }
  }
  const sorted = [...rows.values()].sort((a, b) => a.runtime.localeCompare(b.runtime) || b.sessions - a.sessions);
  console.log('runtime  rule  skill                     transcripts  before-edit  late  never');
  for (const row of sorted) {
    console.log(`${row.runtime.padEnd(8)} ${(row.hard ? 'hard' : 'soft').padEnd(5)} ${row.skill.padEnd(25)} ${String(row.sessions).padStart(11)} ${String(row.before).padStart(12)} ${String(row.after).padStart(5)} ${String(row.never).padStart(6)}`);
  }
  if (verbose && misses.length) console.log(`\n${misses.join('\n')}`);
}

report();
