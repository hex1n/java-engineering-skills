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

test('Codex: a user message holding the full SKILL.md counts as explicit (assumed layout)', () => {
  const user = { type: 'response_item', payload: { type: 'message', role: 'user', content: [{ type: 'input_text', text: `<skill>\n${body('java-testing')}\n</skill>` }] } };
  assert.equal(row(transcript([user]), 'java-testing').how, 'explicit');
  const cut = { type: 'response_item', payload: { type: 'message', role: 'user', content: [{ type: 'input_text', text: body('java-testing').slice(0, 500) }] } };
  assert.equal(analyze(transcript([cut])).size, 0);
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
