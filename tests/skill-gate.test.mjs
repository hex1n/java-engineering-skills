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
const skills = edits => classify(edits).map(hit => `${hit.skill}:${hit.hard ? 'hard' : 'soft'}`).sort();
const edit = (file, content = '') => ({ tool_name: 'Edit', cwd: '/repo', tool_input: { file_path: file, new_string: content } });

test('path rules separate tests, production code, SQL, and scratch files', () => {
  assert.deepEqual(skills([{ path: '/repo/app/src/test/java/a/FooTest.java' }]), ['java-testing:hard', 'use-modern-java:hard']);
  assert.deepEqual(skills([{ path: '/repo/app/src/main/java/a/Foo.java' }]), ['use-modern-java:hard']);
  assert.deepEqual(skills([{ path: '/repo/src/main/resources/mybatis/FooMapper.xml' }]), ['database-transactions:hard']);
  assert.deepEqual(skills([{ path: '/repo/db/migration/V2__add.sql' }]), ['database-transactions:hard']);
  assert.deepEqual(skills([{ path: '/repo/q1-nav.sql' }]), []);
  assert.deepEqual(skills([{ path: '/repo/pom.xml' }]), []);
  assert.deepEqual(extractEdits('Write', { file_path: 'C:\\Users\\me\\AppData\\Local\\Temp\\x\\FooTest.java', content: '' }), []);
});

test('content rules remind from the written text only', t => {
  const hits = classify([{ path: '/repo/src/main/java/a/Svc.java', content: '@Transactional\nvoid run(RLock lock) {}' }]);
  assert.deepEqual(hits.map(hit => hit.skill).sort(),
    ['database-transactions', 'redis-engineering', 'spring-boot-engineering', 'use-modern-java']);
  assert.ok(hits.every(hit => hit.hard === (hit.skill === 'use-modern-java')));

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-gate-src-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'Processor.java');
  fs.writeFileSync(file, 'import java.util.concurrent.TimeUnit;\nclass Processor {}\n');
  assert.deepEqual(skills([{ path: file, content: 'BigDecimal payout = income.add(tail);' }]), ['use-modern-java:hard']);
});

test('shell commands gate written files only', () => {
  const paths = command => extractEdits('Bash', { command }).map(edit => edit.path);
  assert.deepEqual(paths("sed -i '/import x;/d' app/src/test/java/a/FooTest.java"), ['app/src/test/java/a/FooTest.java']);
  assert.deepEqual(paths('grep -n foo src/test/java/a/FooTest.java > /c/Users/me/Temp/out.txt'), []);
  assert.deepEqual(paths('for n in A B; do cat src/test/java/$n.java; done'), []);
  assert.deepEqual(paths("python - <<'EOF'\np='src/test/java/a/FooTest.java'\nopen(p,'w').write(s)\nEOF"), ['src/test/java/a/FooTest.java']);
});

test('script writes gate their resolved targets, not file names in the written text', () => {
  const paths = command => extractEdits('Bash', { command }).map(edit => edit.path);
  // A script rewriting a test suite whose assertions name Java files.
  assert.deepEqual(paths("python - <<'EOF'\np='tests/gate.test.mjs'\ns=open(p).read()\ns=s.replace(\"'a/FooTest.java'\", \"'b/FooTest.java'\")\nopen(p,'w',encoding='utf-8').write(s)\nEOF"), []);
  assert.deepEqual(paths("python - <<'EOF'\nfrom pathlib import Path\nPath('src/main/java/a/Foo.java').write_text(s)\nEOF"), ['src/main/java/a/Foo.java']);
  assert.deepEqual(paths("python - <<'EOF'\nfiles=['src/main/java/a/A.java','README.md']\nfor f in files:\n    open(f,'w').write(s)\nEOF"), ['src/main/java/a/A.java']);
  assert.deepEqual(paths("node -e \"const target = 'src/main/java/a/B.java'; fs.writeFileSync(target, s)\""), ['src/main/java/a/B.java']);
  // Targets from argv or an unassigned name fall back to every Java file named.
  const argv = "f=src/main/java/a/Proc.java; python - \"$f\" <<'EOF'\nimport sys\np=sys.argv[1]\nopen(p,'w',encoding='utf-8',newline='').write(s)\nEOF";
  assert.deepEqual(paths(argv), ['src/main/java/a/Proc.java']);
  assert.deepEqual(paths("python - <<'EOF'\ndef save(path):\n    open(path,'w').write(s)\nsave('src/main/java/a/C.java')\nEOF"), ['src/main/java/a/C.java']);
  // A parameter shadowing a literal assignment still falls back.
  assert.deepEqual(paths("python -c \"\ndef edit(p):\n    open(p,'wb').write(s)\nedit('src/main/java/a/D.java')\np='docs/x.md'\nopen(p,'w').write(s)\n\"").sort(), ['src/main/java/a/D.java']);
  const tuples = "python - <<'EOF'\np='docs/a.md'\nopen(p,'w').write(s)\nfor p,amt in [('src/test/java/a/ETest.java','x'),\n              ('src/test/java/a/FTest.java','y')]:\n    open(p,'w').write(s)\nEOF";
  assert.deepEqual(paths(tuples).sort(), ['src/test/java/a/ETest.java', 'src/test/java/a/FTest.java']);
  assert.deepEqual(paths("$T=\"src/test/java/a/GTest.java\"\npython -c \"\np=r'$T'\nio.open(p,'w').write(s)\n\""), ['src/test/java/a/GTest.java']);
  assert.deepEqual(paths("[IO.File]::WriteAllText((Join-Path (Get-Location) 'src/main/java/a/H.java'), $t)"), ['src/main/java/a/H.java']);
  assert.deepEqual(paths("python - <<'EOF'\nopen('docs/a.md','w').write(s)\nEOF\ncat > src/main/java/a/I.java <<'EOF'\nclass I {}\nEOF"), ['src/main/java/a/I.java']);
  const mutants = "python - <<'EOF'\nCASES = {\n 'm1': ('src/main/java/a/J.java',\n   'a', 'b'),\n}\nfor name, (path, old, new) in CASES.items():\n    open(path, 'w').write(s)\nEOF";
  assert.deepEqual(paths(mutants), ['src/main/java/a/J.java']);
  assert.deepEqual(paths("python - <<'EOF'\nimport shutil\nshutil.copy2('/tmp/K.java', 'src/main/java/a/K.java')\nEOF"), ['src/main/java/a/K.java']);
  assert.deepEqual(paths("function Edit-All([string]$path){ [IO.File]::WriteAllText($path, $t) }\nEdit-All 'src/test/java/a/LTest.java'"), ['src/test/java/a/LTest.java']);
  assert.deepEqual(paths("$H=\"src/main/java/a/M.java\"\n(Get-Content $H -Raw).Replace('a','b') | Set-Content $H"), ['src/main/java/a/M.java']);
  assert.deepEqual(paths("node -e \"\nfor (const p of [\n 'src/main/java/a/N.java',\n 'docs/n.md']) {\n  fs.writeFileSync(p, s);\n}\n\""), ['src/main/java/a/N.java']);
  assert.deepEqual(paths("python - <<'EOF'\n(base/'src/main/java/a/O.java').unlink()\nEOF"), ['src/main/java/a/O.java']);
  assert.deepEqual(paths("AR=src/main/java/a/P.java && sed -i 's#a#b#' \"$AR\""), ['src/main/java/a/P.java']);
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
  const first = decide(test, {});
  assert.match(first.block, /java-engineering-skills:java-testing/);
  assert.match(first.block, /java-engineering-skills:use-modern-java/);
  const retry = decide(test, first.state);
  assert.equal(retry.block, null);

  const loaded = decide(test, {}, { findLoaded: () => new Set(['java-testing', 'use-modern-java']) });
  assert.equal(loaded.block, null);
  assert.deepEqual(loaded.state.loaded.sort(), ['java-testing', 'use-modern-java']);

  const main = decide(edit('/repo/src/main/java/a/Foo.java'), {});
  assert.match(main.block, /use-modern-java/);
  assert.equal(decide(edit('/repo/src/main/java/a/Bar.java'), main.state).block, null);

  const service = edit('/repo/src/main/java/a/Svc.java', '@Transactional\nvoid run() {}');
  const reminded = decide(service, { loaded: ['use-modern-java'] });
  assert.equal(reminded.block, null);
  assert.match(reminded.context, /database-transactions/);
  assert.equal(decide(service, reminded.state).context, null);
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
