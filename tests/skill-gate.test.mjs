import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { classify, decide, extractEdits, loadedInTranscript, skillLoads } from '../plugins/java-engineering-skills/hooks/skill-gate.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GATE = path.join(ROOT, 'plugins/java-engineering-skills/hooks/skill-gate.mjs');
const noImports = { readImports: () => '' };
const skills = edits => classify(edits, noImports).map(hit => `${hit.skill}:${hit.hard ? 'hard' : 'soft'}`).sort();
const edit = (file, content = '') => ({ tool_name: 'Edit', cwd: '/repo', tool_input: { file_path: file, new_string: content } });

test('path rules separate tests, production code, SQL, and scratch files', () => {
  assert.deepEqual(skills([{ path: '/repo/app/src/test/java/a/FooTest.java' }]), ['java-testing:hard']);
  assert.deepEqual(skills([{ path: '/repo/app/src/main/java/a/Foo.java' }]), ['use-modern-java:soft']);
  assert.deepEqual(skills([{ path: '/repo/src/main/resources/mybatis/FooMapper.xml' }]), ['database-transactions:hard']);
  assert.deepEqual(skills([{ path: '/repo/db/migration/V2__add.sql' }]), ['database-transactions:hard']);
  assert.deepEqual(skills([{ path: '/repo/q1-nav.sql' }]), []);
  assert.deepEqual(skills([{ path: '/repo/pom.xml' }]), []);
  assert.deepEqual(extractEdits('Write', { file_path: 'C:\\Users\\me\\AppData\\Local\\Temp\\x\\FooTest.java', content: '' }), []);
});

test('content rules remind from imports and written text', () => {
  const hits = classify([{ path: '/repo/src/main/java/a/Svc.java', content: '@Transactional\nvoid run() {}' }],
    { readImports: () => 'import org.redisson.api.RLock;' });
  assert.deepEqual(hits.map(hit => hit.skill).sort(),
    ['database-transactions', 'redis-engineering', 'spring-boot-engineering', 'use-modern-java']);
  assert.ok(hits.every(hit => !hit.hard));
});

test('shell commands gate written files only', () => {
  const paths = command => extractEdits('Bash', { command }).map(edit => edit.path);
  assert.deepEqual(paths("sed -i '/import x;/d' app/src/test/java/a/FooTest.java"), ['app/src/test/java/a/FooTest.java']);
  assert.deepEqual(paths('grep -n foo src/test/java/a/FooTest.java > /c/Users/me/Temp/out.txt'), []);
  assert.deepEqual(paths('for n in A B; do cat src/test/java/$n.java; done'), []);
  assert.deepEqual(paths("python - <<'EOF'\np='src/test/java/a/FooTest.java'\nopen(p,'w').write(s)\nEOF"), ['src/test/java/a/FooTest.java']);
});

test('Codex apply_patch text, raw or inside an exec script, is parsed', () => {
  const patch = '*** Begin Patch\n*** Update File: C:/repo/src/test/java/a/FooTest.java\n@@\n+@Test void smoke() {}\n*** End Patch';
  assert.deepEqual(extractEdits('apply_patch', { command: patch }),
    [{ path: 'C:/repo/src/test/java/a/FooTest.java', content: '@Test void smoke() {}\n' }]);
  const exec = `text(await tools.apply_patch(${JSON.stringify(patch)}))`;
  assert.equal(extractEdits('exec', { input: exec })[0].path, 'C:/repo/src/test/java/a/FooTest.java');
});

test('skill loads are recognised from the Skill tool and SKILL.md reads', () => {
  assert.deepEqual(skillLoads('Skill', { skill: 'java-engineering-skills:java-testing' }), ['java-testing']);
  assert.deepEqual(skillLoads('exec', { input: 'Get-Content C:/x/0.7.0/skills/database-transactions/SKILL.md' }), ['database-transactions']);
  assert.deepEqual(skillLoads('Read', { file_path: 'C:\\x\\skills\\writing-for-agents\\SKILL.md' }), []);
});

test('transcript scan ignores skill listings and finds real loads in both runtimes', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-gate-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 't.jsonl');
  const lines = [
    { type: 'user', message: { content: '- java-engineering-skills:java-testing: Design tests (file: r3/java-testing/SKILL.md)' } },
    { type: 'response_item', payload: { type: 'message', content: [{ text: '(file: r3/redis-engineering/SKILL.md)' }] } },
    { type: 'response_item', payload: { type: 'custom_tool_call', name: 'exec', input: 'Get-Content C:/c/skills/database-transactions/SKILL.md' } },
  ];
  fs.writeFileSync(file, lines.map(line => JSON.stringify(line)).join('\n'));
  assert.deepEqual([...loadedInTranscript(file, ['java-testing', 'redis-engineering', 'database-transactions'])], ['database-transactions']);
});

test('hard rules block once, soft rules remind once, loaded skills pass', () => {
  const test = edit('/repo/src/test/java/a/FooTest.java');
  const first = decide(test, {}, noImports);
  assert.match(first.block, /java-engineering-skills:java-testing/);
  const retry = decide(test, first.state, noImports);
  assert.equal(retry.block, null);

  const loaded = decide(test, {}, { ...noImports, findLoaded: () => new Set(['java-testing']) });
  assert.equal(loaded.block, null);
  assert.deepEqual(loaded.state.loaded, ['java-testing']);

  const main = decide(edit('/repo/src/main/java/a/Foo.java'), {}, noImports);
  assert.equal(main.block, null);
  assert.match(main.context, /use-modern-java/);
  assert.equal(decide(edit('/repo/src/main/java/a/Bar.java'), main.state, noImports).context, null);
});

test('the hook process exits 2 with a reason, then 0 on retry', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-gate-data-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const input = JSON.stringify({ session_id: 's1', cwd: '/repo', ...edit('/repo/src/test/java/a/FooTest.java') });
  const run = () => spawnSync(process.execPath, [GATE], { input, encoding: 'utf8', env: { ...process.env, PLUGIN_DATA: dir, CLAUDE_PLUGIN_DATA: '' } });
  const first = run();
  assert.equal(first.status, 2);
  assert.match(first.stderr, /java-testing/);
  assert.equal(run().status, 0);
  const broken = spawnSync(process.execPath, [GATE], { input: 'not json', encoding: 'utf8' });
  assert.equal(broken.status, 0);
});
