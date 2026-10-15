#!/usr/bin/env node
// Pre-edit skill check, a PreToolUse hook for Claude Code and Codex. When an edit touches a file that
// one of this plugin's skills owns and that skill has not been loaded in the
// session, edits stay blocked (hard rules) or receive a reminder once (soft
// rules). Successful skill reads are tracked per session or subagent.
// Node.js built-ins only.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PLUGIN = 'java-engineering-skills';

// Path rules decide from the file alone. Hard rules require a completed load.
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
 * from argv, a directory walk, or an unassigned name is reported as unresolved;
 * unrelated file-name literals are never promoted to confirmed write targets.
 */
function scriptTargets(raw, onUnresolved) {
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
  if (!resolved) onUnresolved();
  return targets;
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
 * `scriptTargets`. An unterminated region is left as code: the check keeps its
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

function shellTargets(text, onUnresolved) {
  const tokens = target => resolveToken(text, target);
  const targets = [...(scriptTargets(text, onUnresolved) || [])];
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
    const header = /^\*\*\* (?:Add|Update|Delete) File: (.+?)\s*"?\)?;?$/.exec(line);
    if (header) {
      current = { path: posix(header[1].replace(/\\\\/g, '\\')), content: '' };
      edits.push(current);
    } else if (line.startsWith('*** Move to: ')) {
      current = { path: posix(line.slice('*** Move to: '.length).trim()), content: '' };
      edits.push(current);
    } else if (/^\*\*\* End Patch/.test(line)) current = null;
    else if (current && line.startsWith('+')) current.content += `${line.slice(1)}\n`;
  }
  return edits;
}

/**
 * Files a tool call writes, with the text it writes where known.
 * Claude passes Edit/Write/MultiEdit/NotebookEdit input; everything else
 * (Codex apply_patch or exec, Bash, PowerShell) is scanned as text.
 */
export function extractEdits(toolName, toolInput, { cwd, onUnresolved = () => {} } = {}) {
  const input = toolInput && typeof toolInput === 'object' ? toolInput : objectInput(toolInput);
  cwd = input.workdir || input.cwd || cwd;
  const resolvePath = file => {
    const api = /^[A-Za-z]:[\\/]|^\\\\/.test(cwd || file) ? path.win32 : path;
    return posix(cwd ? api.resolve(cwd, file) : api.normalize(file));
  };
  const keep = edits => edits.map(edit => ({ ...edit, path: resolvePath(edit.path) }))
    .filter(edit => !isScratch(edit.path));
  const file = input.file_path || input.notebook_path;
  if (file && /^(Edit|Write|MultiEdit|NotebookEdit)$/.test(toolName || '')) {
    const content = [input.new_string, input.content, input.new_source, ...(input.edits || []).map(edit => edit.new_string)]
      .filter(text => typeof text === 'string').join('\n');
    return keep([{ path: file, content }]);
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
  for (let text of strings(toolInput)) {
    for (const patch of patchEdits(text)) add(patch.path, patch.content);
    // Patch bodies are data even when they contain executable source code.
    text = text.replace(/\*\*\* Begin Patch[\s\S]*?\*\*\* End Patch/g, '');
    if (/(^|[._])apply_patch$/.test(toolName || '')) continue;
    for (const call of commandCalls(text).reverse()) {
      for (const edit of extractEdits('exec_command', call.input, { cwd, onUnresolved })) add(edit.path, edit.content);
      text = text.slice(0, call.start) + text.slice(call.end);
    }
    const regions = dataRegions(text);
    for (const region of regions.filter(region => !region.code)) {
      const target = dataTarget(text, region);
      if (target) add(posix(target.replace(/\\\\/g, '\\')), region.body);
    }
    for (const token of shellTargets(codeOnly(text, regions), onUnresolved)) add(posix(token.replace(/\\\\/g, '\\')));
  }
  return keep(edits);
}

function objectInput(input) {
  if (typeof input !== 'string') return input || {};
  try { return JSON.parse(input); } catch { return {}; }
}

// Decode literal command arguments only; never execute tool-supplied JavaScript.
function commandCalls(code) {
  const calls = [];
  for (const match of code.matchAll(/tools\.exec_command\s*\(/g)) {
    const [args = ''] = callArgs(code, match.index + match[0].length, 1);
    const input = {};
    for (const property of args.matchAll(/(?:^|[,{])\s*["']?(cmd|workdir)["']?\s*:\s*("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`[^`]*`)/g)) {
      const [, key, literal] = property;
      try {
        if (literal[0] === '"') input[key] = JSON.parse(literal);
        else if (!literal.includes('${')) input[key] = literal.slice(1, -1).replace(/\\n/g, '\n').replace(/\\(['\\])/g, '$1');
      } catch { /* dynamic or malformed command: no read evidence */ }
    }
    if (input.cmd) calls.push({ start: match.index, end: match.index + match[0].length + args.length + 1, input });
  }
  return calls;
}

function readCommands(toolName, toolInput) {
  const input = objectInput(toolInput);
  if (typeof (input.cmd ?? input.command) === 'string') return [input.cmd ?? input.command];
  const code = typeof toolInput === 'string' ? toolInput : input.input ?? input.code ?? '';
  if (typeof code !== 'string') return [];
  const commands = commandCalls(code).map(call => call.input.cmd);
  return commands.length || code.includes('tools.') ? commands : /^(exec|Bash|PowerShell|shell|shell_command|local_shell)$/.test(toolName) ? [code] : [];
}

/** Skills requested by explicit reads. A request alone never counts as loaded. */
export function skillLoads(toolName, toolInput) {
  toolName = (toolName || '').split('.').pop();
  const input = objectInput(toolInput);
  const found = new Set();
  if (toolName === 'Skill' && typeof input.skill === 'string') {
    const name = input.skill.replace(/^\//, '');
    if (name.startsWith(`${PLUGIN}:`) && SKILL_NAMES.includes(name.split(':')[1])) found.add(name.split(':')[1]);
  }
  const reads = toolName === 'Read' ? [input.file_path || ''] : readCommands(toolName, toolInput)
    .flatMap(command => segments(codeOnly(command, dataRegions(command))))
    .filter(command => /^\s*(?:Get-Content|cat|type)\s+/i.test(command));
  for (const text of reads) {
    for (const match of text.matchAll(/(?:^|[\\/])([a-z-]+)[\\/]+SKILL\.md(?=[\s"';,]|$)/g)) {
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
    calls.push({ toolName: payload.name, toolInput: payload.arguments ?? payload.input, id: payload.call_id });
  }
  return calls;
}

const normalizeRead = text => text.replace(/\r\n?/g, '\n').replace(/^[ \t]*\d+[→\t]/gm, '').trim();
const skillBodies = new Map();
function containsSkill(text, skill) {
  if (!skillBodies.has(skill)) {
    skillBodies.set(skill, normalizeRead(fs.readFileSync(new URL(`../skills/${skill}/SKILL.md`, import.meta.url), 'utf8')));
  }
  return normalizeRead(text).includes(skillBodies.get(skill));
}

function results(line) {
  let record;
  try { record = JSON.parse(line); } catch { return []; }
  if (record.type === 'user' && Array.isArray(record.message?.content)) {
    return record.message.content.filter(item => item.type === 'tool_result')
      .map(item => ({ id: item.tool_use_id, output: item.content, failed: item.is_error }));
  }
  const item = record.payload;
  return /^(custom_tool_call_output|function_call_output)$/.test(item?.type || '')
    ? [{ id: item.call_id, output: item.output, failed: item.is_error }] : [];
}

/** Pair reads with completed results; usable by the hook and offline statistics. */
export function transcriptLoads() {
  const pending = new Map();
  const continuations = new Map();
  return line => {
    for (const call of toolCalls(line)) {
      if (!call.id) continue;
      const input = objectInput(call.toolInput);
      const raw = strings(call.toolInput).join('\n');
      const cell = input.cell_id ?? /["']?cell_id["']?\s*:\s*["']([^"']+)/.exec(raw)?.[1];
      const session = input.session_id ?? /["']?session_id["']?\s*:\s*(\d+)/.exec(raw)?.[1];
      const resumed = /wait$/.test(call.toolName) ? continuations.get(`cell:${cell}`)
        : /write_stdin/.test(call.toolName + raw) ? continuations.get(`session:${session}`) : null;
      const skills = skillLoads(call.toolName, call.toolInput);
      if (resumed) {
        continuations.delete(`cell:${cell}`);
        continuations.delete(`session:${session}`);
      }
      if (resumed || skills.length) pending.set(call.id, resumed || {
        skills, text: '', direct: /(^|\.)(Read|Skill)$/.test(call.toolName), invocation: /(^|\.)Skill$/.test(call.toolName),
      });
    }
    const loaded = new Set();
    for (const result of results(line)) {
      const read = pending.get(result.id);
      if (!read) continue;
      pending.delete(result.id);
      const output = strings(result.output).join('\n');
      read.text += `\n${output}`;
      const cell = /Script running with cell ID\s+(\S+)/.exec(output)?.[1];
      const session = /"session_id"\s*:\s*(\d+)/.exec(output)?.[1];
      const exitCodes = [...output.matchAll(/"exit_code"\s*:\s*(-?\d+)|(?:Process exited with code|Exit code:)\s*(-?\d+)/gi)]
        .map(match => Number(match[1] ?? match[2]));
      const failed = result.failed || exitCodes.some(code => code !== 0) || /"isError"\s*:\s*true/.test(output);
      if (failed) continue;
      if (cell) { continuations.set(`cell:${cell}`, read); continue; }
      if (session && !exitCodes.length) { continuations.set(`session:${session}`, read); continue; }
      if (!read.direct && !exitCodes.length) continue;
      for (const skill of read.skills) if ((read.invocation && output.trim()) || containsSkill(read.text, skill)) loaded.add(skill);
    }
    return loaded;
  };
}

export function loadedInTranscript(file, wanted) {
  const found = new Set();
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch { return found; }
  const consume = transcriptLoads();
  for (const line of text.split('\n')) for (const skill of consume(line)) if (wanted.includes(skill)) found.add(skill);
  return found;
}

function stateFile(key) {
  const dir = process.env.PLUGIN_DATA || process.env.CLAUDE_PLUGIN_DATA || path.join(os.tmpdir(), `${PLUGIN}-pre-edit-skill-check`);
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
  // Version 1 marked attempts as loaded. Rebuild that unverified cache from receipts.
  const loaded = new Set(state.version === 2 ? state.loaded || [] : []);
  const prompted = new Set(state.prompted || []);
  const cwd = input.cwd || process.cwd();
  let unresolved = false;
  const edits = extractEdits(input.tool_name, input.tool_input, { cwd, onUnresolved: () => { unresolved = true; } });
  let hits = classify(edits).filter(hit => !loaded.has(hit.skill) && (hit.hard || !prompted.has(hit.skill)));
  if (hits.length) {
    for (const skill of findLoaded(hits.map(hit => hit.skill))) loaded.add(skill);
    hits = hits.filter(hit => !loaded.has(hit.skill));
  }
  const hard = hits.filter(hit => hit.hard);
  const soft = hits.filter(hit => !hit.hard);
  // If the runtime shows only the refusal, do not consume a soft reminder yet.
  if (!hard.length) soft.forEach(hit => prompted.add(hit.skill));
  const warning = unresolved ? `${PLUGIN}: a script write target could not be resolved. Use an explicit file path and load the applicable skill before editing project code.` : null;
  return {
    block: hard.length ? message(hard, true) : null,
    context: [soft.length ? message(soft, false) : null, warning].filter(Boolean).join('\n') || null,
    targets: edits.map(edit => edit.path),
    missing: hard.map(hit => hit.skill),
    unresolved,
    state: { version: 2, loaded: [...loaded], prompted: [...prompted] },
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
  if (process.env.JES_PRE_EDIT_SKILL_CHECK_DUMP) {
    fs.appendFileSync(process.env.JES_PRE_EDIT_SKILL_CHECK_DUMP, `${JSON.stringify({ env: { PLUGIN_ROOT: process.env.PLUGIN_ROOT, PLUGIN_DATA: process.env.PLUGIN_DATA, CLAUDE_PLUGIN_ROOT: process.env.CLAUDE_PLUGIN_ROOT }, input })}\n`);
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
  // No source, command text or transcript contents in the audit trail.
  try {
    fs.appendFileSync(file.replace(/\.json$/, '.audit.jsonl'), `${JSON.stringify({
      time: new Date().toISOString(), callId: input.tool_use_id ?? input.tool_call_id ?? input.call_id ?? null,
      tool: input.tool_name, targets: result.targets, missing: result.missing,
      reason: result.block ? 'skill-not-loaded' : result.unresolved ? 'unresolved-write' : result.context ? 'reminder' : 'allowed',
      decision: result.block ? 'deny' : 'allow',
    })}\n`);
  } catch (error) { process.stderr.write(`${PLUGIN}: audit unavailable: ${error.code || 'write failed'}\n`); }
  if (result.block) {
    // Codex 0.162 on Windows runs the tool after an exit-2 refusal; both hosts honor this deny shape.
    process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse',
      permissionDecision: 'deny', permissionDecisionReason: result.block } }));
    return 0;
  }
  if (result.context) {
    process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext: result.context } }));
  }
  return 0;
}

function isEntryPoint() {
  if (!process.argv[1]) return false;
  try {
    // Node resolves module URLs through symlinks (including macOS /var -> /private/var).
    return fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url));
  } catch { return false; }
}

if (isEntryPoint()) {
  try { process.exitCode = main(); } catch (error) {
    // A failure of the check must never block editing.
    process.stderr.write(`${PLUGIN} pre-edit skill check skipped: ${error.message}\n`);
    process.exitCode = 0;
  }
}
