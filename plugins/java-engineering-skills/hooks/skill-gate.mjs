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
  { skill: 'use-modern-java', hard: true, test: p => /\.java$/i.test(p) },
  { skill: 'spring-boot-engineering', hard: false, test: p => /(^|\/)(application|bootstrap)[\w-]*\.(ya?ml|properties)$/i.test(p) },
];

// Content rules read only the text being written: imports already in the file
// say nothing about this edit. They remind only.
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

// Scratch and temp files are investigation artifacts, not project code. The
// name test also covers transcripts recorded on another host; the tmpdir test
// adds this host's real temp root, which on macOS is `/var/folders/<..>/T`
// and carries no recognisable name.
const SCRATCH = /\/(Temp|tmp|scratchpad|\.scratch)\//i;

/** Prefixes that mean "inside this host's temp directory", as `/`-terminated lower case. */
export function tempRoots(tmpdir) {
  const root = posix(tmpdir).replace(/\/+$/, '').toLowerCase();
  const roots = [root];
  // macOS reports `/var/folders/…`; the same directory resolves to `/private/var/…`.
  if (root.startsWith('/var/')) roots.push(`/private${root}`);
  if (root.startsWith('/private/var/')) roots.push(root.slice('/private'.length));
  return roots.map(value => `${value}/`);
}

const TEMP_ROOTS = tempRoots(os.tmpdir());

export const isScratch = (file, roots = TEMP_ROOTS) => SCRATCH.test(posix(file))
  || roots.some(root => `${posix(file).toLowerCase()}/`.startsWith(root));
const FILE_TOKEN = /(?<![\w$.:\\/-])[\w.:\\/-]+\.(java|sql|xml|ya?ml|properties)\b/gi;
// Shell forms that write the files they name. Reads are not gated.
const IN_PLACE = /\bsed\s+(-\w*i|--in-place)|\bperl\s+-\w*i/;
// A heredoc fed to one of these runs its body as code; anything else (`cat`,
// `tee`, a bare redirection) receives the body as the data it writes.
const INTERPRETER = /^(?:[\w.\\/-]*[\\/])?(python[\d.]*|node|deno|bun|bash|sh|zsh|ksh|dash|pwsh|powershell|perl|ruby|php|osascript|psql|mysql|sqlite3)(?:\.exe)?$/i;
// A data body written to one of these is a script about to run, not a document.
const SCRIPT_FILE = /\.(?:py|pyw|mjs|cjs|js|ts|sh|bash|zsh|ps1|psm1|rb|pl|php|groovy|lua)\b/i;
// Script calls whose argument, or whose receiver, is the file written. Copy
// and move calls write their second argument.
const WRITE_CALL = /\b(open|(?:write|append|unlink|rm)FileSync|(?:write|append|unlink|rm)Sync|os\.(?:remove|unlink)|(?:Write|Append)All(?:Text|Lines|Bytes))\s*\(/g;
const COPY_CALL = /\b(?:shutil\.(?:copy2?|copyfile|move)|copyFileSync|renameSync|File\]::(?:Copy|Move))\s*\(/g;
const WRITE_METHOD = /\.(?:write_(?:text|bytes)|unlink)\s*\(/g;
const WRITE_MODE = /^\s*(?:mode\s*=\s*)?[rbfu]*['"][^'"]*[wax+]/;
// Targets taken from outside the script cannot be resolved from its text.
const DYNAMIC = /\bargv\b|\$args\b|\benviron\b|process\.env|\b(?:r?glob|listdir|walk|iterdir|input)\s*\(/;
const OPEN = '([{', CLOSE = ')]}';
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

const fileTokens = text => [...text.matchAll(FILE_TOKEN)].map(match => match[0]);

// Top-level arguments of the call whose opening parenthesis ends at `start`.
function callArgs(text, start, limit = 2) {
  const args = [];
  let current = '';
  let depth = 0;
  let quote = null;
  for (let i = start; i < text.length && args.length < limit; i++) {
    const char = text[i];
    if (quote) {
      if (char === '\\') { current += char + (text[++i] ?? ''); continue; }
      if (char === quote) quote = null;
    } else if (char === '\'' || char === '"' || char === '`') quote = char;
    else if (OPEN.includes(char)) depth++;
    else if (CLOSE.includes(char) && depth-- === 0) { args.push(current); return args; }
    else if (char === ',' && depth === 0) { args.push(current); current = ''; continue; }
    current += char;
  }
  if (current) args.push(current);
  return args;
}

// The rest of the statement from `start`: to a newline or `;` outside brackets and quotes.
function statement(text, start) {
  let depth = 0;
  let quote = null;
  let i = start;
  for (; i < text.length && i - start < 8000; i++) {
    const char = text[i];
    if (quote) {
      if (char === '\\') i++;
      else if (char === quote) quote = null;
    } else if (char === '\'' || char === '"' || char === '`') quote = char;
    else if (OPEN.includes(char)) depth++;
    else if (CLOSE.includes(char)) depth = Math.max(0, depth - 1);
    else if ((char === '\n' || char === ';') && depth === 0) break;
  }
  return text.slice(start, i);
}

// The receiver expression that ends just before `end`: names, dots, and bracketed groups.
function receiver(text, end) {
  let i = end;
  for (;;) {
    if (CLOSE.includes(text[i - 1])) {
      let depth = 0;
      do {
        if (CLOSE.includes(text[--i])) depth++;
        else if (OPEN.includes(text[i])) depth--;
      } while (depth > 0 && i > 0);
    } else if (/[\w$.]/.test(text[i - 1] || '')) i--;
    else return text.slice(i, end);
  }
}

/**
 * Files an inline script writes, or null when there is no script write. Each
 * write target is resolved through literal assignments; a target that comes
 * from argv, a directory walk, or an unassigned name falls back to every file
 * the script names, so strings in the written text do not count on their own.
 */
function scriptTargets(raw) {
  // Codex exec input carries the script inside a JS string literal.
  const text = /\\[n"]/.test(raw) ? raw.replace(/\\n/g, '\n').replace(/\\(["'\\])/g, '$1') : raw;
  const writes = [];
  for (const match of text.matchAll(WRITE_CALL)) {
    const [target, mode = ''] = callArgs(text, match.index + match[0].length);
    if (target !== undefined && (match[1] !== 'open' || WRITE_MODE.test(mode))) writes.push(target);
  }
  for (const match of text.matchAll(COPY_CALL)) {
    const [, target] = callArgs(text, match.index + match[0].length);
    if (target !== undefined) writes.push(target);
  }
  for (const match of text.matchAll(WRITE_METHOD)) writes.push(receiver(text, match.index));
  if (!writes.length) return null;
  // Values a name takes: `name = …` (shell `$name` included) and loop headers,
  // tuple targets too. A function parameter's value is not in view.
  const assignments = name => {
    const bare = name.replace(/^\$/, '');
    const own = `(?<![\\w$])\\$?${bare}(?![\\w$])`;
    const loopNames = `[\\w$,\\s()\\[\\]]*?${own}[\\w$,\\s()\\[\\]]*?`;
    const pattern = new RegExp(`(?:^|[^\\w$.])\\$?${bare}\\s*(?::[^=\\n]*)?=(?!=)`
      + `|\\bfor\\s+${loopNames}\\s+in\\s+([\\s\\S]{0,4000}?):[ \\t]*\\r?\\n`
      + `|\\bfor(?:each)?\\s*\\(\\s*(?:const|let|var)?\\s*${loopNames}\\s+(?:in|of)\\s+(?<list>)`, 'g');
    return [...text.matchAll(pattern)].map(match => {
      const end = match.index + match[0].length;
      if (match[1] !== undefined) return match[1];
      return match.groups.list !== undefined ? callArgs(text, end, 1)[0] ?? '' : statement(text, end);
    });
  };
  const isParameter = name => {
    const own = new RegExp(`(?<![\\w$])\\$?${name.replace(/^\$/, '')}(?![\\w$])`);
    const lists = /\b(?:def|function)\s*[\w$-]*\s*\(([^)]*)\)|\bparam\s*\(([^)]*)\)|\(([^()]*)\)\s*=>|([\w$]+)\s*=>|\blambda\s+([^:]*):/g;
    return [...text.matchAll(lists)].some(match => own.test(match.slice(1).join(' ')));
  };
  const targets = [];
  let resolved = true;
  // A literal file name settles the target; otherwise follow the names it is built from.
  const resolve = (expr, depth) => {
    const found = fileTokens(expr);
    if (found.length) return targets.push(...found);
    if (DYNAMIC.test(expr)) resolved = false;
    const code = expr.replace(/[rbfuRBFU]*(['"`])(?:\\.|(?!\1)[^\\])*\1/g, ' ');
    const names = [
      ...(code.match(/(?<![\w$.-])[A-Za-z_$][\w$]*(?![\w$]*\s*[(.-])/g) || []),
      // Shell variables and f-string fields interpolated into string literals.
      ...[...expr.matchAll(/\$\{?([A-Za-z_]\w*)|\{([A-Za-z_]\w*)\}/g)].map(match => match[1] ?? match[2]),
    ];
    for (const name of new Set(names)) {
      const values = assignments(name);
      if (!values.length || depth === 0 || isParameter(name)) resolved = false;
      else values.forEach(value => resolve(value, depth - 1));
    }
    // A receiver such as `CASES` in `CASES.items()` is followed when the script
    // assigns it; unassigned receivers are modules (`os.path`) and say nothing.
    for (const name of new Set(code.match(/(?<![\w$.-])[A-Za-z_$][\w$]*(?=\s*\.)/g) || [])) {
      if (depth > 0) assignments(name).forEach(value => resolve(value, depth - 1));
    }
  };
  writes.forEach(expr => resolve(expr, 2));
  return resolved ? targets : fileTokens(text);
}

// A shell variable target (`> $f`, `Set-Content $H`) takes its assigned value.
function resolveToken(text, target) {
  const variable = /^\$\{?([A-Za-z_]\w*)\}?$/.exec(target);
  if (!variable) return fileTokens(target);
  const assigned = new RegExp(`(?:^|[\\s;(])\\$?${variable[1]}\\s*=\\s*["']?([^\\s"';]+)`, 'g');
  return [...text.matchAll(assigned)].flatMap(match => fileTokens(match[1]));
}

/**
 * Regions of a command that carry data rather than code: a heredoc body whose
 * consumer is not an interpreter, and a PowerShell here-string. The body is the
 * content of a write, so scanning it for write targets invents targets out of
 * prose — a Markdown citation line `> \`Foo.java:12\`` is not a redirection.
 * An interpreter's heredoc body is real code and stays in view for
 * `scriptTargets`. An unterminated region is left as code: the gate keeps its
 * previous reading rather than swallowing the rest of the command.
 */
export function dataRegions(text) {
  const regions = [];
  const heredoc = /<<-?[ \t]*(?:(['"])([A-Za-z_]\w*)\1|([A-Za-z_]\w*))/g;
  for (let match; (match = heredoc.exec(text));) {
    const word = match[2] ?? match[3];
    const newline = text.indexOf('\n', match.index + match[0].length);
    if (newline < 0) continue;
    const start = newline + 1;
    // The delimiter owns its whole line. A multiline `$` already stops before a
    // CR; `\r?` takes that CR into the region so none is left in the code.
    const close = new RegExp(`^[ \\t]*${word}[ \\t]*\\r?$`, 'm').exec(text.slice(start));
    if (!close) continue;
    // The consumer is the command the heredoc feeds: the segment it opens in,
    // or a pipe after the marker (`cat <<'EOF' | python -`). A redirection can
    // also follow the marker (`cat <<'EOF' > out.java`), so the whole opening
    // line is the scope that names the target.
    const opening = segments(text.slice(0, match.index)).pop() || '';
    const rest = text.slice(match.index + match[0].length, newline);
    regions.push({
      start,
      end: start + close.index + close[0].length,
      body: text.slice(start, start + close.index),
      code: [opening, ...segments(rest)].some(segment => INTERPRETER.test(segment.trim().split(/\s+/)[0] || '')),
      head: `${opening} ${rest}`,
    });
    heredoc.lastIndex = regions[regions.length - 1].end;
  }
  const hereString = /@(['"])[ \t]*\r?\n/g;
  for (let match; (match = hereString.exec(text));) {
    const start = match.index + match[0].length;
    const close = new RegExp(`^${match[1]}@`, 'm').exec(text.slice(start));
    if (!close) continue;
    regions.push({
      start,
      end: start + close.index + close[0].length,
      body: text.slice(start, start + close.index),
      code: false,
      variable: /(\$\w+)\s*=\s*$/.exec(text.slice(0, match.index))?.[1],
    });
    hereString.lastIndex = regions[regions.length - 1].end;
  }
  // A body written out as a script (`cat > /tmp/fix.py <<'EOF'`, then
  // `python /tmp/fix.py`) runs next, so its own writes stay in view.
  for (const region of regions) {
    if (!region.code && writeScopes(text, region).some(scope => SCRIPT_FILE.test(scope))) region.code = true;
  }
  // A region inside a data body is part of that body (a heredoc writing a .ps1
  // that holds a here-string); keeping both would remove overlapping spans.
  // Inside a code body it is the script's own data and stays.
  const kept = [];
  for (const region of regions.sort((a, b) => a.start - b.start)) {
    if (!kept.some(outer => !outer.code && region.start < outer.end)) kept.push(region);
  }
  return kept;
}

/**
 * The command text that says where a data region goes. A heredoc names its
 * target on its opening line. A here-string is either assigned to a variable
 * that a later `Set-Content`/`Out-File` writes out, or piped straight into
 * one: `@'…'@ | Set-Content x`.
 */
function writeScopes(text, region) {
  if (region.head !== undefined) return [region.head];
  const after = segments(text.slice(region.end));
  return region.variable ? after.filter(segment => segment.includes(region.variable)) : after.slice(0, 1);
}

/** The file a data region is written to, or null when the command only pipes it. */
function dataTarget(text, region) {
  for (const scope of writeScopes(text, region)) {
    for (const pattern of WRITE_TARGET) {
      for (const match of scope.matchAll(pattern)) {
        const [file] = resolveToken(text, match[1]);
        if (file) return file;
      }
    }
  }
  return null;
}

/** The command with its data regions removed, so only shell code is scanned. */
function codeOnly(text, regions) {
  let code = text;
  for (const region of [...regions].filter(region => !region.code).reverse()) {
    code = code.slice(0, region.start) + code.slice(region.end);
  }
  return code;
}

function shellTargets(text) {
  const tokens = target => resolveToken(text, target);
  const targets = [...(scriptTargets(text) || [])];
  for (const segment of segments(text)) {
    if (IN_PLACE.test(segment)) {
      targets.push(...fileTokens(segment));
      for (const match of segment.matchAll(/\$\{?[A-Za-z_]\w*\}?/g)) targets.push(...tokens(match[0]));
    }
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
    return isScratch(file) ? [] : [{ path: posix(file), content }];
  }
  if (/^(Read|Glob|Grep|Skill|LS)$/.test(toolName || '')) return [];
  const edits = [];
  // First content wins: a heredoc body is the text written, an unattributed
  // token from the surrounding command says nothing about the content.
  const add = (file, content = '') => {
    const previous = edits.find(edit => edit.path === file);
    if (!previous) edits.push({ path: file, content });
    else if (content && !previous.content) previous.content = content;
  };
  for (const text of strings(toolInput)) {
    for (const patch of patchEdits(text)) add(patch.path, patch.content);
    const regions = dataRegions(text);
    for (const region of regions.filter(region => !region.code)) {
      const target = dataTarget(text, region);
      if (target) add(posix(target.replace(/\\\\/g, '\\')), region.body);
    }
    for (const token of shellTargets(codeOnly(text, regions))) add(posix(token.replace(/\\\\/g, '\\')));
  }
  return edits.filter(edit => !isScratch(edit.path));
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

/** Skills that own the given edits: [{skill, hard, file}], one entry per skill, hard wins. */
export function classify(edits) {
  const hits = new Map();
  const add = (skill, hard, file) => {
    const previous = hits.get(skill);
    if (!previous || (hard && !previous.hard)) hits.set(skill, { skill, hard, file });
  };
  for (const { path: file, content = '' } of edits) {
    for (const rule of PATH_RULES) if (rule.test(file, content)) add(rule.skill, rule.hard, file);
    if (!/\.java$/i.test(file)) continue;
    for (const rule of CONTENT_RULES) if (rule.pattern.test(content)) add(rule.skill, false, file);
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
export function decide(input, state, { findLoaded = () => new Set() } = {}) {
  const loaded = new Set(state.loaded || []);
  const prompted = new Set(state.prompted || []);
  for (const skill of skillLoads(input.tool_name, input.tool_input)) loaded.add(skill);
  const cwd = input.cwd || process.cwd();
  const edits = extractEdits(input.tool_name, input.tool_input)
    .map(edit => ({ ...edit, path: posix(path.resolve(cwd, edit.path)) }));
  let hits = classify(edits).filter(hit => !loaded.has(hit.skill) && !prompted.has(hit.skill));
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
