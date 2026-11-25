import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { analyze } from '../scripts/pre-edit-skill-check-stats.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const body = skill => fs.readFileSync(path.join(ROOT, 'plugins/java-engineering-skills/skills', skill, 'SKILL.md'), 'utf8');
const strip = text => text.replace(/^---\n[\s\S]*?\n---\n\n?/, '');
const P = 'java-engineering-skills';

// Claude Code record layouts as written by Claude Code 2.1.332: a tool call, its
// result (a refused edit is an error result carrying the hook's reason), the
// meta record holding an injected skill, and the reminder attachment.
const use = (id, name, input) => ({ type: 'assistant', message: { content: [{ type: 'tool_use', id, name, input }] } });
const result = (id, content, isError) => ({ type: 'user', message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: id, content, ...(isError ? { is_error: true } : {}) }] } });
const injected = (skill, toolUseId) => ({ type: 'user', isMeta: true, ...(toolUseId ? { sourceToolUseID: toolUseId } : {}),
  message: { role: 'user', content: [{ type: 'text', text: `Base directory for this skill: /p/skills/${skill}\n\n${strip(body(skill))}\n\nARGUMENTS: x` }] } });
const typed = skill => ({ type: 'user', message: { role: 'user', content: `<command-message>${P}:${skill}</command-message>\n<command-name>/${P}:${skill}</command-name>` } });
const skillCall = (id, skill) => [use(id, 'Skill', { skill: `${P}:${skill}` }), result(id, `Launching skill: ${P}:${skill}`), injected(skill, id)];
const edit = (id, file, content = 'return x * 2;') => use(id, 'Edit', { file_path: file, old_string: 'x', new_string: content });
const refusal = skill => `PreToolUse:Edit hook error: ${P}: this edit was not applied. Load \`${P}:${skill}\` (for Foo.java) now, then retry this exact edit.`;
const reminder = skill => ({ type: 'attachment', attachment: { type: 'hook_additional_context', hookEvent: 'PreToolUse',
  content: [`${P}: this edit touches \`${P}:${skill}\` (for Foo.java). If that concern is part of the change, load the skill before continuing.`] } });
const transcript = records => records.flat().map(record => JSON.stringify(record)).join('\n');
const FOO = '/repo/src/main/java/a/Foo.java';
const row = (text, skill) => {
  const { how, edited, before, late } = analyze(text).get(skill) || {};
  return { how, edited, before, late };
};

test('a first load is attributed to the model, the user or the check', () => {
  assert.deepEqual(row(transcript([skillCall('s1', 'use-modern-java'), edit('e1', FOO)]), 'use-modern-java'),
    { how: 'model', edited: true, before: true, late: false });
  assert.deepEqual(row(transcript([typed('use-modern-java'), injected('use-modern-java'), edit('e1', FOO)]), 'use-modern-java'),
    { how: 'explicit', edited: true, before: true, late: false });
  // The refused edit did not happen; the retry after the load is the first edit.
  assert.deepEqual(row(transcript([edit('e1', FOO), result('e1', refusal('use-modern-java'), true), skillCall('s1', 'use-modern-java'), edit('e2', FOO)]), 'use-modern-java'),
    { how: 'hook', edited: true, before: true, late: false });
  // A reminder lets the edit through: the load comes late and is the check's doing.
  const spring = transcript([skillCall('s0', 'use-modern-java'), edit('e1', FOO, '@Transactional void run() {}'), reminder('spring-boot-engineering'), skillCall('s1', 'spring-boot-engineering')]);
  assert.deepEqual(row(spring, 'spring-boot-engineering'), { how: 'hook', edited: true, before: false, late: true });
  assert.deepEqual(row(transcript([edit('e1', FOO, '@Transactional void run() {}')]), 'spring-boot-engineering'),
    { how: null, edited: true, before: false, late: false });
});

test('the model quoting the check does not make a load the check\'s doing', () => {
  const quoted = { type: 'assistant', message: { content: [{ type: 'text', text: refusal('use-modern-java') }] } };
  assert.equal(row(transcript([quoted, skillCall('s1', 'use-modern-java')]), 'use-modern-java').how, 'model');
});

// Codex rollout layouts as read from the openai/codex source (commit 06f334aa,
// 2026-11-25), not from a real rollout: every line is {timestamp, type, payload};
// a named skill is a user message `<skill><name/><path/>{SKILL.md}</skill>`
// (ext/skills/src/fragments.rs), a hook's additionalContext a developer message
// (core/src/hook_runtime.rs), and a PreToolUse deny the tool output
// "Tool call blocked by PreToolUse hook: {reason}. Tool: {name}".
const item = payload => ({ timestamp: '2026-11-25T00:00:00.000Z', type: 'response_item', payload });
const message = (role, text) => item({ type: 'message', role, content: [{ type: role === 'assistant' ? 'output_text' : 'input_text', text }] });
const named = (skill, text = body(skill)) => message('user', `<skill>\n<name>${P}:${skill}</name>\n<path>/home/me/.codex/plugins/cache/x/${P}/skills/${skill}/SKILL.md</path>\n${text}\n</skill>`);
const exec = (id, cmd) => item({ type: 'function_call', name: 'exec_command', arguments: JSON.stringify({ cmd }), call_id: id });
const execOutput = (id, output) => item({ type: 'function_call_output', call_id: id, output });
const read = (id, skill) => [exec(id, `cat /home/me/.codex/plugins/cache/x/${P}/skills/${skill}/SKILL.md`), execOutput(id, `Process exited with code 0\nOutput:\n${body(skill)}`)];
const patch = (id, file, line = 'return x * 2;') => item({ type: 'custom_tool_call', call_id: id, name: 'apply_patch',
  input: `*** Begin Patch\n*** Update File: ${file}\n@@\n-return x;\n+${line}\n*** End Patch` });
const blocked = (id, skill) => item({ type: 'custom_tool_call_output', call_id: id,
  output: `Tool call blocked by PreToolUse hook: ${refusal(skill).replace(/^PreToolUse:Edit hook error: /, '')} Tool: apply_patch` });
const TEST = '/repo/src/test/java/a/FooTest.java';

test('Codex: a skill the user names counts as explicit only with the whole file', () => {
  assert.deepEqual(row(transcript([named('java-testing'), patch('p1', TEST)]), 'java-testing'),
    { how: 'explicit', edited: true, before: true, late: false });
  // The host cuts a plugin skill at 8000 bytes; a cut body is not the skill.
  const cut = Buffer.from(body('java-testing')).subarray(0, 500).toString();
  assert.equal(analyze(transcript([named('java-testing', cut)])).size, 0);
  // The user's own words naming the skill are not the skill either.
  assert.equal(analyze(transcript([message('user', `$${P}:java-testing please`)])).size, 0);
});

test('Codex: a refused patch and a developer-message reminder make the load the check\'s doing', () => {
  assert.deepEqual(row(transcript([patch('p1', FOO), blocked('p1', 'use-modern-java'), read('r1', 'use-modern-java'), patch('p2', FOO)]), 'use-modern-java'),
    { how: 'hook', edited: true, before: true, late: false });
  const text = reminder('spring-boot-engineering').attachment.content[0];
  assert.deepEqual(row(transcript([read('r0', 'use-modern-java'), patch('p1', FOO, '@Transactional void run() {}'), message('developer', text), read('r1', 'spring-boot-engineering')]), 'spring-boot-engineering'),
    { how: 'hook', edited: true, before: false, late: true });
  // The model repeating the reminder in its own message is not the check.
  assert.equal(row(transcript([message('assistant', text), read('r1', 'spring-boot-engineering')]), 'spring-boot-engineering').how, 'model');
});

test('an edit whose tool reported an error did not happen', () => {
  // Claude Code checks Edit input ("String to replace not found") before
  // PreToolUse hooks run, so the failed call carries no hook text at all.
  // Measured with claude -p 2.1.332 on 2026-11-25.
  assert.equal(analyze(transcript([edit('e1', FOO), result('e1', '<tool_use_error>String to replace not found in file.</tool_use_error>', true)])).size, 0);
});

test('the report reads both transcript roots and prints JSON rows', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pre-edit-skill-check-stats-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.mkdirSync(path.join(dir, 'claude/p'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'claude/p/a.jsonl'), transcript([typed('use-modern-java'), injected('use-modern-java'), edit('e1', FOO)]));
  fs.writeFileSync(path.join(dir, 'claude/p/b.jsonl'), transcript([edit('e1', FOO), result('e1', refusal('use-modern-java'), true), skillCall('s1', 'use-modern-java'), edit('e2', FOO)]));
  const run = spawnSync(process.execPath, [path.join(ROOT, 'scripts/pre-edit-skill-check-stats.mjs'), '--json',
    '--claude', path.join(dir, 'claude'), '--codex', path.join(dir, 'none')], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  assert.deepEqual(JSON.parse(run.stdout), [{ runtime: 'claude', skill: 'use-modern-java', rule: 'hard', transcripts: 2,
    model: 0, explicit: 1, hook: 1, notLoaded: 0, edited: 2, beforeEdit: 2, late: 0 }]);
});

test('the report reads Codex sessions and archived sessions under CODEX_HOME', t => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'pre-edit-skill-check-codex-'));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const day = path.join(home, 'sessions/2026/11/25');
  fs.mkdirSync(day, { recursive: true });
  fs.mkdirSync(path.join(home, 'archived_sessions'));
  fs.writeFileSync(path.join(day, 'rollout-2026-11-25T10-00-00-a.jsonl'), transcript([named('java-testing'), patch('p1', TEST)]));
  fs.writeFileSync(path.join(home, 'archived_sessions/rollout-2026-11-20T10-00-00-b.jsonl'), transcript([read('r1', 'java-testing'), patch('p1', TEST)]));
  fs.writeFileSync(path.join(day, 'rollout-2026-11-25T11-00-00-c.jsonl.zst'), 'not read');
  const run = spawnSync(process.execPath, [path.join(ROOT, 'scripts/pre-edit-skill-check-stats.mjs'), '--json', '--claude', path.join(home, 'none')],
    { encoding: 'utf8', env: { ...process.env, CODEX_HOME: home } });
  assert.equal(run.status, 0, run.stderr);
  assert.deepEqual(JSON.parse(run.stdout).filter(row => row.skill === 'java-testing'), [{ runtime: 'codex', skill: 'java-testing', rule: 'hard', transcripts: 2,
    model: 1, explicit: 1, hook: 0, notLoaded: 0, edited: 2, beforeEdit: 2, late: 0 }]);
  assert.match(run.stderr, /Skipped 1 compressed Codex rollout/);
});
