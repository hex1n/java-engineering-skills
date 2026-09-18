#!/usr/bin/env node
// PreToolUse gate for Claude Code and Codex. When an edit touches a file that
// one of this plugin's skills owns and that skill has not been loaded in the
// session, the first such edit is blocked (hard rules) or annotated with a
// reminder (soft rules). Each skill is prompted at most once per session or
// subagent. Node.js built-ins only.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PLUGIN = 'java-engineering-skills';

// Path rules decide from the file alone. Hard rules block the first edit.
const PATH_RULES = [
  { skill: 'java-testing', hard: true, test: p => /\.java$/i.test(p) && /(^|\/)src\/test\//.test(p) },
  { skill: 'database-transactions', hard: true, test: (p, text) =>
    (/\.sql$/i.test(p) && /(^|\/)(src|db|sql|migrations?|schema)\//i.test(p))
    || /(^|\/)(db\/migration|flyway|liquibase)\//i.test(p)
    || (/\.xml$/i.test(p) && (/(^|\/)(mybatis|mappers?)\//i.test(p) || /(Mapper|Dao)\.xml$/.test(p) || /mybatis\.org\/\/DTD Mapper/.test(text))) },
  { skill: 'use-modern-java', hard: false, test: p => /\.java$/i.test(p) && !/(^|\/)src\/test\//.test(p) },
  { skill: 'spring-boot-engineering', hard: false, test: p => /(^|\/)(application|bootstrap)[\w-]*\.(ya?ml|properties)$/i.test(p) },
];

// Content rules read the file's imports plus the text being written. They
// remind only: an import does not prove the edit is about that concern.
const CONTENT_RULES = [
  { skill: 'spring-boot-engineering', pattern: /@(Transactional|Cacheable|CacheEvict|CachePut|Async|Configuration|ConfigurationProperties|SpringBootApplication|ConditionalOn\w+)\b|import org\.springframework\.boot\./ },
  { skill: 'database-transactions', pattern: /@Transactional\b|\bJdbcTemplate\b|\bSqlSession\b|\bEntityManager\b|\bFOR UPDATE\b|import org\.apache\.ibatis\.|import (javax|jakarta)\.persistence\./i },
  { skill: 'redis-engineering', pattern: /\b(StringRedisTemplate|RedisTemplate|RedissonClient|RLock|Jedis\w*|LettuceConnectionFactory)\b|import org\.redisson\.|import io\.lettuce\./ },
  { skill: 'messaging-reliability', pattern: /@(KafkaListener|RabbitListener|RocketMQMessageListener|StreamListener)\b|\b(KafkaTemplate|RabbitTemplate|RocketMQTemplate|DefaultMQProducer|DefaultMQPushConsumer)\b|import org\.apache\.(kafka|rocketmq)\./ },
  { skill: 'java-concurrency', pattern: /import java\.util\.concurrent\.|\bsynchronized\s*[({]|\bvolatile\s|\b(CompletableFuture|ExecutorService|ThreadPoolExecutor|ReentrantLock|CountDownLatch)\b/ },
  { skill: 'java-api-security', pattern: /@(RestController|RequestMapping|GetMapping|PostMapping|PutMapping|DeleteMapping|SofaService|DubboService|PreAuthorize|Secured)\b/ },
];

const SKILL_NAMES = [...new Set([...PATH_RULES, ...CONTENT_RULES].map(rule => rule.skill))];
const posix = file => file.replace(/\\/g, '/');

// Scratch and temp files are investigation artifacts, not project code.
const SCRATCH = /\/(Temp|tmp|scratchpad|\.scratch)\//i;
const FILE_TOKEN = /(?<![\w$.:\\/-])[\w.:\\/-]+\.(java|sql|xml|ya?ml|properties)\b/gi;
// Shell forms that write the files they name. Reads are not gated.
const IN_PLACE = /\bsed\s+(-\w*i|--in-place)|\bperl\s+-\w*i/;
const SCRIPT_WRITE = /open\([^)]*,\s*['"][wa]|\.write_text\(|writeFileSync\(|WriteAll(Text|Lines|Bytes)/;
const WRITE_TARGET = [
  /(?<![<>=&|-])>{1,2}\s*["']?([^\s"';|&<>]+)/g,
  /\b(?:tee(?:\s+-a)?|Set-Content|Add-Content|Out-File)\s+(?:-(?:Path|FilePath|LiteralPath)\s+)?["']?([^\s"';|&]+)/g,
];

// Splits on ; && || | and newlines outside single or double quotes.
function segments(text) {
  const parts = [];
  let current = '';
  let quote = null;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quote) {
      if (char === quote) quote = null;
      current += char;
    } else if (char === '\'' || char === '"') {
      quote = char;
      current += char;
    } else if (char === ';' || char === '|' || char === '&' || char === '\n' || (char === '\\' && text[i + 1] === 'n')) {
      if (char === '\\') i++;
      if (current.trim()) parts.push(current);
      current = '';
    } else current += char;
  }
  if (current.trim()) parts.push(current);
  return parts;
}

function shellTargets(text) {
  const tokens = text => [...text.matchAll(FILE_TOKEN)].map(match => match[0]);
  if (SCRIPT_WRITE.test(text)) return tokens(text);
  const targets = [];
  for (const segment of segments(text)) {
    if (IN_PLACE.test(segment)) targets.push(...tokens(segment));
    for (const pattern of WRITE_TARGET) for (const match of segment.matchAll(pattern)) targets.push(...tokens(match[1]));
    const copy = /\b(?:cp|mv|Copy-Item|Move-Item)\s+.*\s["']?([^\s"']+)["']?\s*$/.exec(segment);
    if (copy) targets.push(...tokens(copy[1]));
  }
  return targets;
}

function strings(value, out = []) {
  if (typeof value === 'string') {
    out.push(value);
    const trimmed = value.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try { strings(JSON.parse(trimmed), out); } catch { /* not JSON */ }
    }
  } else if (Array.isArray(value)) value.forEach(item => strings(item, out));
  else if (value && typeof value === 'object') Object.values(value).forEach(item => strings(item, out));
  return out;
}

// Parse apply_patch text, raw or embedded as an escaped string literal.
function patchEdits(text) {
  const edits = [];
  const lines = text.split(/\r?\n|\\n/);
  let current = null;
  for (const line of lines) {
    const header = /\*\*\* (?:Add|Update) File: (.+?)\s*"?\)?;?$/.exec(line);
    if (header) {
      current = { path: posix(header[1].replace(/\\\\/g, '\\')), content: '' };
      edits.push(current);
    } else if (/^\*\*\* (End Patch|Delete File|Move to)/.test(line)) current = null;
    else if (current && line.startsWith('+')) current.content += `${line.slice(1)}\n`;
  }
  return edits;
}

/**
 * Files a tool call writes, with the text it writes where known.
 * Claude passes Edit/Write/MultiEdit/NotebookEdit input; everything else
 * (Codex apply_patch or exec, Bash, PowerShell) is scanned as text.
 */
export function extractEdits(toolName, toolInput) {
  const input = toolInput && typeof toolInput === 'object' ? toolInput : {};
  const file = input.file_path || input.notebook_path;
  if (file && /^(Edit|Write|MultiEdit|NotebookEdit)$/.test(toolName || '')) {
    const content = [input.new_string, input.content, input.new_source, ...(input.edits || []).map(edit => edit.new_string)]
      .filter(text => typeof text === 'string').join('\n');
    return SCRATCH.test(posix(file)) ? [] : [{ path: posix(file), content }];
  }
  if (/^(Read|Glob|Grep|Skill|LS)$/.test(toolName || '')) return [];
  const edits = [];
  for (const text of strings(toolInput)) {
    edits.push(...patchEdits(text));
    for (const token of shellTargets(text)) {
      const file = posix(token.replace(/\\\\/g, '\\'));
      if (!edits.some(edit => edit.path === file)) edits.push({ path: file, content: '' });
    }
  }
  return edits.filter(edit => !SCRATCH.test(edit.path));
}

/** Skills this tool call loads: a Skill invocation or a read of <skill>/SKILL.md. */
export function skillLoads(toolName, toolInput) {
  const found = new Set();
  if (toolName === 'Skill' && typeof toolInput?.skill === 'string') {
    const name = toolInput.skill.replace(/^\//, '').split(':').pop();
    if (SKILL_NAMES.includes(name)) found.add(name);
  }
  for (const text of strings(toolInput)) {
    for (const match of text.matchAll(/(?:^|[\\/])([a-z-]+)[\\/]+SKILL\.md/g)) {
      if (SKILL_NAMES.includes(match[1])) found.add(match[1]);
    }
  }
  return [...found];
}

function importLines(file) {
  try {
    const stat = fs.statSync(file);
    if (!stat.isFile() || stat.size > 1_000_000) return '';
    return fs.readFileSync(file, 'utf8').split('\n').filter(line => /^\s*import\s/.test(line)).join('\n');
  } catch { return ''; }
}

/** Skills that own the given edits: [{skill, hard, file}], one entry per skill, hard wins. */
export function classify(edits, { readImports = importLines } = {}) {
  const hits = new Map();
  const add = (skill, hard, file) => {
    const previous = hits.get(skill);
    if (!previous || (hard && !previous.hard)) hits.set(skill, { skill, hard, file });
  };
  for (const { path: file, content = '' } of edits) {
    const text = `${file.endsWith('.java') ? readImports(file) : ''}\n${content}`;
    for (const rule of PATH_RULES) if (rule.test(file, content)) add(rule.skill, rule.hard, file);
    if (!/\.java$/i.test(file)) continue;
    for (const rule of CONTENT_RULES) if (rule.pattern.test(text)) add(rule.skill, false, file);
  }
  return [...hits.values()];
}

/** Reads one transcript line from either runtime as {toolName, toolInput} calls. */
export function toolCalls(line) {
  let record;
  try { record = JSON.parse(line); } catch { return []; }
  const calls = [];
  const content = record?.message?.content;
  if (record?.type === 'assistant' && Array.isArray(content)) {
    for (const item of content) if (item?.type === 'tool_use') calls.push({ toolName: item.name, toolInput: item.input, id: item.id });
  }
  const payload = record?.payload;
  if (payload && /(^|_)call$/.test(payload.type || '')) {
    calls.push({ toolName: payload.name, toolInput: payload.arguments ?? payload.input });
  }
  return calls;
}

export function loadedInTranscript(file, wanted) {
  const found = new Set();
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch { return found; }
  for (const line of text.split('\n')) {
    if (!wanted.some(skill => line.includes(skill))) continue;
    for (const { toolName, toolInput } of toolCalls(line)) {
      for (const skill of skillLoads(toolName, toolInput)) found.add(skill);
    }
  }
  return found;
}

function stateFile(key) {
  const dir = process.env.PLUGIN_DATA || process.env.CLAUDE_PLUGIN_DATA || path.join(os.tmpdir(), `${PLUGIN}-skill-gate`);
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${key.replace(/[^\w.-]/g, '_')}.json`);
}

function message(hits, hard) {
  const list = hits.map(hit => `\`${PLUGIN}:${hit.skill}\` (for ${path.basename(hit.file)})`).join(', ');
  const how = 'In Claude Code invoke it with the Skill tool; in Codex read that skill\'s SKILL.md.';
  return hard
    ? `${PLUGIN}: this edit was not applied. Load ${list} now, then retry this exact edit. ${how}`
    : `${PLUGIN}: this edit touches ${list}. If that concern is part of the change, load the skill before continuing. ${how} Shown once per session.`;
}

/** Decides one hook call. Returns {block, context, loaded, prompted} with state updates. */
export function decide(input, state, { findLoaded = () => new Set(), readImports } = {}) {
  const loaded = new Set(state.loaded || []);
  const prompted = new Set(state.prompted || []);
  for (const skill of skillLoads(input.tool_name, input.tool_input)) loaded.add(skill);
  const cwd = input.cwd || process.cwd();
  const edits = extractEdits(input.tool_name, input.tool_input)
    .map(edit => ({ ...edit, path: posix(path.resolve(cwd, edit.path)) }));
  let hits = classify(edits, { readImports }).filter(hit => !loaded.has(hit.skill) && !prompted.has(hit.skill));
  if (hits.length) {
    for (const skill of findLoaded(hits.map(hit => hit.skill))) loaded.add(skill);
    hits = hits.filter(hit => !loaded.has(hit.skill));
  }
  hits.forEach(hit => prompted.add(hit.skill));
  const hard = hits.filter(hit => hit.hard);
  const soft = hits.filter(hit => !hit.hard);
  return {
    block: hard.length ? message(hard, true) : null,
    context: soft.length ? message(soft, false) : null,
    state: { loaded: [...loaded], prompted: [...prompted] },
  };
}

function transcripts(input) {
  const files = [];
  if (input.agent_id && input.transcript_path && input.session_id) {
    files.push(path.join(path.dirname(input.transcript_path), input.session_id, 'subagents', `agent-${input.agent_id}.jsonl`));
  }
  if (input.agent_transcript_path) files.push(input.agent_transcript_path);
  if (!input.agent_id && input.transcript_path) files.push(input.transcript_path);
  return files;
}

function main() {
  let input;
  try { input = JSON.parse(fs.readFileSync(0, 'utf8')); } catch { return 0; }
  if (process.env.JES_SKILL_GATE_DUMP) {
    fs.appendFileSync(process.env.JES_SKILL_GATE_DUMP, `${JSON.stringify({ env: { PLUGIN_ROOT: process.env.PLUGIN_ROOT, PLUGIN_DATA: process.env.PLUGIN_DATA, CLAUDE_PLUGIN_ROOT: process.env.CLAUDE_PLUGIN_ROOT }, input })}\n`);
  }
  const key = [input.session_id || 'unknown', input.agent_id].filter(Boolean).join('-');
  const file = stateFile(key);
  let state = {};
  try { state = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* first call */ }
  const findLoaded = wanted => {
    const found = new Set();
    for (const transcript of transcripts(input)) for (const skill of loadedInTranscript(transcript, wanted)) found.add(skill);
    return found;
  };
  const result = decide(input, state, { findLoaded });
  fs.writeFileSync(file, JSON.stringify(result.state));
  if (result.block) {
    process.stderr.write(`${result.block}\n`);
    return 2;
  }
  if (result.context) {
    process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext: result.context } }));
  }
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.exitCode = main(); } catch (error) {
    // A gate failure must never block editing.
    process.stderr.write(`${PLUGIN} skill gate skipped: ${error.message}\n`);
    process.exitCode = 0;
  }
}
