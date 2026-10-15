import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { classify, decide, extractEdits, isScratch, loadedInTranscript, skillLoads, tempRoots } from '../plugins/java-engineering-skills/hooks/pre-edit-skill-check.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOOK = path.join(ROOT, 'plugins/java-engineering-skills/hooks/pre-edit-skill-check.mjs');
const skills = edits => classify(edits).map(hit => `${hit.skill}:${hit.hard ? 'hard' : 'soft'}`).sort();
const edit = (file, content = '') => ({ tool_name: 'Edit', cwd: '/repo', tool_input: { file_path: file, new_string: content } });
const body = skill => fs.readFileSync(path.join(ROOT, 'plugins/java-engineering-skills/skills', skill, 'SKILL.md'), 'utf8');
const call = (id, name, input) => ({ type: 'response_item', payload: { type: 'custom_tool_call', call_id: id, name, input } });
const output = (id, value) => ({ type: 'response_item', payload: { type: 'custom_tool_call_output', call_id: id, output: value } });
const command = skill => `Get-Content C:/plugins/skills/${skill}/SKILL.md`;

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

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pre-edit-skill-check-src-'));
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
  // Dynamic parameters remain unknown; a mentioned filename is not a proven write.
  const argv = "f=src/main/java/a/Proc.java; python - \"$f\" <<'EOF'\nimport sys\np=sys.argv[1]\nopen(p,'w',encoding='utf-8',newline='').write(s)\nEOF";
  assert.deepEqual(paths(argv), []);
  assert.deepEqual(paths("python - <<'EOF'\ndef save(path):\n    open(path,'w').write(s)\nsave('src/main/java/a/C.java')\nEOF"), []);
  assert.deepEqual(paths("python -c \"\ndef edit(p):\n    open(p,'wb').write(s)\nedit('src/main/java/a/D.java')\np='docs/x.md'\nopen(p,'w').write(s)\n\"").sort(), []);
  const tuples = "python - <<'EOF'\np='docs/a.md'\nopen(p,'w').write(s)\nfor p,amt in [('src/test/java/a/ETest.java','x'),\n              ('src/test/java/a/FTest.java','y')]:\n    open(p,'w').write(s)\nEOF";
  assert.deepEqual(paths(tuples).sort(), ['src/test/java/a/ETest.java', 'src/test/java/a/FTest.java']);
  assert.deepEqual(paths("$T=\"src/test/java/a/GTest.java\"\npython -c \"\np=r'$T'\nio.open(p,'w').write(s)\n\""), ['src/test/java/a/GTest.java']);
  assert.deepEqual(paths("[IO.File]::WriteAllText((Join-Path (Get-Location) 'src/main/java/a/H.java'), $t)"), ['src/main/java/a/H.java']);
  assert.deepEqual(paths("python - <<'EOF'\nopen('docs/a.md','w').write(s)\nEOF\ncat > src/main/java/a/I.java <<'EOF'\nclass I {}\nEOF"), ['src/main/java/a/I.java']);
  const mutants = "python - <<'EOF'\nCASES = {\n 'm1': ('src/main/java/a/J.java',\n   'a', 'b'),\n}\nfor name, (path, old, new) in CASES.items():\n    open(path, 'w').write(s)\nEOF";
  assert.deepEqual(paths(mutants), ['src/main/java/a/J.java']);
  assert.deepEqual(paths("python - <<'EOF'\nimport shutil\nshutil.copy2('/tmp/K.java', 'src/main/java/a/K.java')\nEOF"), ['src/main/java/a/K.java']);
  assert.deepEqual(paths("function Edit-All([string]$path){ [IO.File]::WriteAllText($path, $t) }\nEdit-All 'src/test/java/a/LTest.java'"), []);
  assert.deepEqual(paths("$H=\"src/main/java/a/M.java\"\n(Get-Content $H -Raw).Replace('a','b') | Set-Content $H"), ['src/main/java/a/M.java']);
  assert.deepEqual(paths("node -e \"\nfor (const p of [\n 'src/main/java/a/N.java',\n 'docs/n.md']) {\n  fs.writeFileSync(p, s);\n}\n\""), ['src/main/java/a/N.java']);
  assert.deepEqual(paths("python - <<'EOF'\n(base/'src/main/java/a/O.java').unlink()\nEOF"), ['src/main/java/a/O.java']);
  assert.deepEqual(paths("AR=src/main/java/a/P.java && sed -i 's#a#b#' \"$AR\""), ['src/main/java/a/P.java']);
});

test('a data heredoc is the written content, not a list of targets', () => {
  const paths = command => extractEdits('Bash', { command }).map(edit => edit.path);
  // Evidence citations in a Markdown body are prose; `>` there is not a redirection.
  const doc = '# notes\n> `OrderService.java:126-136`\n> `OrderMapper.xml:233`\n';
  assert.deepEqual(paths("cat > docs/notes.md <<'DOC'\n" + doc + 'DOC\n'), []);
  assert.deepEqual(paths("tee docs/notes.md <<'DOC'\n" + doc + 'DOC\n'), []);
  // The body is the text written, so the content rules read it.
  const write = "cat > src/main/java/a/Svc.java <<'EOF'\n@Transactional\nclass Svc { RLock lock; }\nEOF\n";
  assert.deepEqual(extractEdits('Bash', { command: write }),
    [{ path: 'src/main/java/a/Svc.java', content: '@Transactional\nclass Svc { RLock lock; }\n' }]);
  assert.deepEqual(classify(extractEdits('Bash', { command: write })).map(hit => hit.skill).sort(),
    ['database-transactions', 'redis-engineering', 'spring-boot-engineering', 'use-modern-java']);
  // A CRLF command closes the body on the delimiter line all the same; the
  // path alone would also come from the redirection, so the content is checked.
  assert.deepEqual(extractEdits('Bash', { command: "cat > src/main/java/a/Crlf.java <<'EOF'\r\nclass Crlf {}\r\nEOF\r\n" }),
    [{ path: 'src/main/java/a/Crlf.java', content: 'class Crlf {}\r\n' }]);
  // The consumer decides: `cat` receives data even when an earlier word says python.
  assert.deepEqual(paths('echo "python" && cat > src/main/java/a/Q.java <<\'EOF\'\nclass Q {}\nEOF'), ['src/main/java/a/Q.java']);
  // An unterminated body keeps the previous reading instead of swallowing the command.
  assert.ok(paths("cat > docs/notes.md <<'DOC'\n" + doc).length > 0);
  // A body written out as a script runs next, so the script's own writes count.
  assert.deepEqual(paths("cat > /tmp/fix.py <<'EOF'\nopen('src/main/java/a/F.java','w').write(s)\nEOF\npython /tmp/fix.py"),
    ['src/main/java/a/F.java']);
  // The consumer and the target can both follow the marker on its line.
  assert.deepEqual(paths("cat <<'EOF' | python -\nopen('src/main/java/a/G.java','w').write(s)\nEOF"), ['src/main/java/a/G.java']);
  assert.deepEqual(extractEdits('Bash', { command: "cat <<'EOF' > src/main/java/a/Late.java\nclass Late {}\nEOF" }),
    [{ path: 'src/main/java/a/Late.java', content: 'class Late {}\n' }]);
  // A here-string inside a data body (a Markdown page showing a PowerShell
  // snippet) is part of that body; the write after it still counts.
  assert.deepEqual(paths("cat > docs/ps-example.md <<'EOF'\n$t = @'\nx\n'@\nEOF\nsed -i 's/a/b/' src/main/java/a/After.java"),
    ['src/main/java/a/After.java']);
});

test('a PowerShell here-string is the written content, not a list of targets', () => {
  const paths = command => extractEdits('PowerShell', { command }).map(edit => edit.path);
  const doc = '# notes\n> `OrderService.java:126-136`\n';
  assert.deepEqual(paths("$t = @'\n" + doc + "'@\nSet-Content -Path docs/notes.md -Value $t"), []);
  assert.deepEqual(extractEdits('PowerShell', { command: "$t = @'\n@Transactional\nclass Svc {}\n'@\nSet-Content -Path src/main/java/a/Svc.java -Value $t" }),
    [{ path: 'src/main/java/a/Svc.java', content: '@Transactional\nclass Svc {}\n' }]);
  // Piped straight into the writer, with no variable in between.
  assert.deepEqual(extractEdits('PowerShell', { command: "@'\nclass Pipe {}\n'@ | Set-Content -Path src/main/java/a/Pipe.java" }),
    [{ path: 'src/main/java/a/Pipe.java', content: 'class Pipe {}\n' }]);
  assert.deepEqual(paths("@'\n" + doc + "'@ | Out-File docs/notes.md"), []);
  // Written out as a script, the body is code again.
  assert.deepEqual(paths("$r = @'\nfs.writeFileSync('src/main/java/a/H.java', s)\n'@\nSet-Content -NoNewline -Encoding utf8 \"$d\\run.mjs\" $r"),
    ['src/main/java/a/H.java']);
});

test('temp roots are recognised on Windows, Linux, and macOS hosts', () => {
  assert.deepEqual(tempRoots('C:\\Users\\me\\AppData\\Local\\Temp'), ['c:/users/me/appdata/local/temp/']);
  assert.deepEqual(tempRoots('/tmp'), ['/tmp/']);
  // macOS reports /var/folders/…; the same directory also resolves under /private.
  const mac = tempRoots('/var/folders/qd/9x_1/T');
  assert.deepEqual(mac, ['/var/folders/qd/9x_1/t/', '/private/var/folders/qd/9x_1/t/']);
  assert.ok(isScratch('/var/folders/qd/9x_1/T/mktemp-X/Probe.java', mac));
  assert.ok(isScratch('/private/var/folders/qd/9x_1/T/work/Probe.java', mac));
  assert.ok(!isScratch('app/src/main/java/a/Real.java', mac));
  // The host's own temp directory is exempt on whichever platform the suite runs.
  assert.deepEqual(extractEdits('Write', { file_path: path.join(os.tmpdir(), 'probe', 'Probe.java'), content: '' }), []);
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

test('transcript scan requires a completed successful read and the complete skill body', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pre-edit-skill-check-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 't.jsonl');
  const lines = [
    { type: 'user', message: { content: '- java-engineering-skills:java-testing: Design tests (file: r3/java-testing/SKILL.md)' } },
    { type: 'response_item', payload: { type: 'message', content: [{ text: '(file: r3/redis-engineering/SKILL.md)' }] } },
    call('db', 'exec', command('database-transactions')),
    output('db', JSON.stringify({ exit_code: 0, output: body('database-transactions') })),
    call('failed', 'exec', command('java-testing')),
    output('failed', JSON.stringify({ exit_code: 1, output: body('java-testing') })),
    call('empty', 'exec', command('java-testing')),
    output('empty', JSON.stringify({ exit_code: 0, output: '' })),
    call('short', 'exec', command('redis-engineering')),
    output('short', JSON.stringify({ exit_code: 0, output: body('redis-engineering').slice(0, 300) })),
    call('pending', 'exec', command('java-testing')),
  ];
  fs.writeFileSync(file, lines.map(line => JSON.stringify(line)).join('\n'));
  assert.deepEqual([...loadedInTranscript(file, ['java-testing', 'redis-engineering', 'database-transactions'])], ['database-transactions']);
});

test('hard rules keep blocking until loaded; only soft rules remind once', () => {
  const test = edit('/repo/src/test/java/a/FooTest.java');
  const first = decide(test, {});
  assert.match(first.block, /java-engineering-skills:java-testing/);
  assert.match(first.block, /java-engineering-skills:use-modern-java/);
  const retry = decide(test, first.state);
  assert.equal(retry.block, first.block);
  assert.equal(decide(test, retry.state).block, first.block);
  assert.match(decide(test, { loaded: ['java-testing', 'use-modern-java'], prompted: ['java-testing', 'use-modern-java'] }).block, /use-modern-java/);

  const loaded = decide(test, {}, { findLoaded: () => new Set(['java-testing', 'use-modern-java']) });
  assert.equal(loaded.block, null);
  assert.deepEqual(loaded.state.loaded.sort(), ['java-testing', 'use-modern-java']);

  const main = decide(edit('/repo/src/main/java/a/Foo.java'), {});
  assert.match(main.block, /use-modern-java/);
  assert.match(decide(edit('/repo/src/main/java/a/Bar.java'), main.state).block, /use-modern-java/);

  const service = edit('/repo/src/main/java/a/Svc.java', '@Transactional\nvoid run() {}');
  const reminded = decide(service, { version: 2, loaded: ['use-modern-java'] });
  assert.equal(reminded.block, null);
  assert.match(reminded.context, /database-transactions/);
  assert.equal(decide(service, reminded.state).context, null);
});

for (const launch of ['shell', 'realpath', 'alias']) {
  test(`the hook process via ${launch} keeps refusing, then allows after successful reads and audits each decision`, t => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pre-edit-skill-check-data-'));
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    const pluginRoot = path.join(dir, 'plugin 中文 path');
    fs.cpSync(path.dirname(path.dirname(HOOK)), pluginRoot, { recursive: true, filter: () => true });
    const hook = path.join(pluginRoot, 'hooks/pre-edit-skill-check.mjs');
    // A filter avoids Node 22's native cp path bug for non-ASCII Windows destinations.
    assert.ok(fs.statSync(hook).isFile(), `copied hook missing: ${hook}`);
    assert.equal(fs.readFileSync(hook, 'utf8'), fs.readFileSync(HOOK, 'utf8'));
    const alias = path.join(dir, 'plugin alias 中文');
    if (launch === 'alias') fs.symlinkSync(pluginRoot, alias, process.platform === 'win32' ? 'junction' : 'dir');
    const transcript = path.join(dir, 'read.jsonl');
    fs.writeFileSync(transcript, '');
    const input = JSON.stringify({ session_id: 's1', tool_use_id: 'edit-1', transcript_path: transcript, ...edit('/repo/src/test/java/a/FooTest.java') });
    const options = { input, encoding: 'utf8', env: { ...process.env,
      PLUGIN_ROOT: pluginRoot, PLUGIN_DATA: dir, CLAUDE_PLUGIN_DATA: '' } };
    // Codex substitutes ${PLUGIN_ROOT} in the command text, then runs it through the hook shell.
    const codexCommand = JSON.parse(fs.readFileSync(path.join(ROOT,
      'plugins/java-engineering-skills/.codex-plugin/plugin.json'), 'utf8'))
      .hooks.hooks.PreToolUse[0].hooks[0].command.replaceAll('${PLUGIN_ROOT}', pluginRoot);
    const run = () => launch === 'shell'
      ? spawnSync(codexCommand, { ...options, shell: true })
      : spawnSync(process.execPath, [launch === 'realpath' ? fs.realpathSync(hook)
        : path.join(alias, 'hooks/pre-edit-skill-check.mjs')], options);
    // A refusal is the deny decision on stdout with exit 0; Codex runs the tool after an exit-2 refusal.
    const decision = (result, expectDeny = true) => {
      const diagnostic = JSON.stringify({ launch, status: result.status, error: result.error?.message,
        stdout: result.stdout, stderr: result.stderr, hook, realHook: fs.realpathSync(hook) });
      assert.equal(result.status, 0, diagnostic);
      if (expectDeny) assert.ok(result.stdout?.trim(), `expected deny JSON, got empty stdout: ${diagnostic}`);
      return result.stdout ? JSON.parse(result.stdout).hookSpecificOutput : null;
    };
    const first = decision(run());
    assert.equal(first.permissionDecision, 'deny');
    assert.match(first.permissionDecisionReason, /java-testing/);
    assert.equal(decision(run()).permissionDecision, 'deny');
    const records = ['java-testing', 'use-modern-java'].flatMap(skill => [
      call(skill, 'exec', `text(await tools.exec_command(${JSON.stringify({ cmd: command(skill) })}));`),
      output(skill, JSON.stringify({ exit_code: 0, output: body(skill) })),
    ]);
    fs.writeFileSync(transcript, records.map(record => JSON.stringify(record)).join('\n'));
    assert.equal(decision(run(), false), null);
    const audits = fs.readFileSync(path.join(dir, 's1.audit.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
    assert.deepEqual(audits.map(item => item.decision), ['deny', 'deny', 'allow']);
    assert.equal(audits[0].callId, 'edit-1');
    assert.equal(audits[0].reason, 'skill-not-loaded');
    assert.equal(audits[2].reason, 'allowed');
    assert.ok(!JSON.stringify(audits).includes('# Use Modern Java'));
    const broken = spawnSync(process.execPath, [HOOK], { input: 'not json', encoding: 'utf8' });
    assert.equal(broken.status, 0);
  });
}

test('scratch patch bodies never become independent script writes; following commands still count', () => {
  const patch = "*** Begin Patch\n*** Update File: C:/repo/.scratch/probe/prepare_classpath.py\n@@\n+args = 'javac PerfMissingDiagnosis.java'\n+(root / 'javac.args').write_text(args, encoding='utf-8')\n*** End Patch";
  assert.deepEqual(extractEdits('apply_patch', patch), []);
  const wrapped = `text(await tools.apply_patch(${JSON.stringify(patch)}));`;
  assert.deepEqual(extractEdits('exec', { input: wrapped }), []);
  const combined = `${wrapped}\ntext(await tools.exec_command({cmd:"sed -i 's/a/b/' src/main/java/Real.java"}));`;
  assert.deepEqual(extractEdits('exec', { input: combined }).map(item => item.path), ['src/main/java/Real.java']);
  const result = decide({ tool_name: 'exec', tool_input: { input: wrapped }, cwd: 'C:/repo' }, {});
  assert.equal(result.block, null);
  assert.equal(result.unresolved, false);
});

test('scratch exclusion follows path resolution, including relative cwd and dot segments', () => {
  assert.equal(decide({ ...edit('Probe.java'), cwd: 'C:/repo/.scratch/probe' }, {}).block, null);
  assert.equal(decide(edit('.scratch/probe/Probe.java'), {}).block, null);
  assert.match(decide(edit('.scratch/../src/main/java/Real.java'), {}).block, /use-modern-java/);
  const input = `text(await tools.exec_command(${JSON.stringify({ cmd: "sed -i 's/a/b/' Probe.java", workdir: 'C:/repo/.scratch/probe' })}));`;
  assert.equal(decide({ tool_name: 'exec', tool_input: input, cwd: 'C:/repo' }, {}).block, null);
});

test('unknown writes warn without inventing targets or exempting the next Java edit', () => {
  const result = decide({ tool_name: 'Bash', tool_input: { command: "python -c \"p=sys.argv[1]; open(p,'w').write('Mention.java')\"" } }, {});
  assert.equal(result.block, null);
  assert.deepEqual(result.targets, []);
  assert.match(result.context, /could not be resolved/);
  assert.match(decide(edit('src/main/java/Real.java'), result.state).block, /use-modern-java/);
});

test('mentions, another plugin and prospective reads cannot mark a skill loaded', () => {
  assert.deepEqual(skillLoads('Skill', { skill: 'another-plugin:use-modern-java' }), []);
  assert.deepEqual(skillLoads('exec_command', { cmd: 'echo C:/skills/use-modern-java/SKILL.md' }), []);
  assert.deepEqual(skillLoads('Write', { file_path: 'notes.md', content: command('use-modern-java') }), []);
  const read = decide({ tool_name: 'exec_command', tool_input: { cmd: command('use-modern-java') } }, {});
  assert.deepEqual(read.state.loaded, []);
  assert.match(decide(edit('src/main/java/Real.java'), read.state).block, /use-modern-java/);
});

test('Claude reads and Skill invocations need matched non-error results', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-claude-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 't.jsonl');
  const records = [
    { type: 'assistant', message: { content: [{ type: 'tool_use', id: 'read', name: 'Read', input: { file_path: 'C:/skills/use-modern-java/SKILL.md' } }] } },
    { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'wrong-id', content: body('use-modern-java') }] } },
    { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'read', is_error: true, content: body('use-modern-java') }] } },
    { type: 'assistant', message: { content: [{ type: 'tool_use', id: 'skill', name: 'Skill', input: { skill: 'java-engineering-skills:java-testing' } }] } },
    { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'skill', content: 'Launching skill: java-engineering-skills:java-testing' }] } },
    { type: 'assistant', message: { content: [{ type: 'tool_use', id: 'read2', name: 'Read', input: { file_path: 'C:/skills/use-modern-java/SKILL.md' } }] } },
    { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'read2', content: body('use-modern-java').split('\n').map((line, i) => `${i + 1}→${line}`).join('\n') }] } },
  ];
  fs.writeFileSync(file, records.map(record => JSON.stringify(record)).join('\n'));
  assert.deepEqual([...loadedInTranscript(file, ['java-testing', 'use-modern-java'])], ['java-testing', 'use-modern-java']);
});

test('Codex yielded reads count only after their matching continuation succeeds', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-yield-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 't.jsonl');
  const records = [call('read', 'exec', command('use-modern-java')), output('read', 'Script running with cell ID 52')];
  const scan = () => {
    fs.writeFileSync(file, records.map(record => JSON.stringify(record)).join('\n'));
    return [...loadedInTranscript(file, ['use-modern-java'])];
  };
  assert.deepEqual(scan(), []);
  records.push(call('wait', 'functions.wait', JSON.stringify({ cell_id: '52' })), output('wait', JSON.stringify({ exit_code: 0, output: body('use-modern-java') })));
  assert.deepEqual(scan(), ['use-modern-java']);
});

test('a soft reminder cannot exempt a later hard rule for the same skill', () => {
  const reminder = decide(edit('src/main/java/Svc.java', '@Transactional'), { version: 2, loaded: ['use-modern-java'] });
  assert.ok(reminder.state.prompted.includes('database-transactions'));
  assert.match(decide(edit('db/migration/V2.sql'), reminder.state).block, /database-transactions/);
});

test('a yielded shell session needs a successful final exit, even if the body arrived early', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-session-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 't.jsonl');
  const records = [
    call('read', 'exec', command('use-modern-java')),
    output('read', JSON.stringify({ session_id: 123, output: body('use-modern-java') })),
  ];
  const scan = extra => {
    fs.writeFileSync(file, [...records, ...extra].map(record => JSON.stringify(record)).join('\n'));
    return [...loadedInTranscript(file, ['use-modern-java'])];
  };
  assert.deepEqual(scan([]), []);
  const poll = call('poll', 'exec', 'text(await tools.write_stdin({session_id:123,chars:""}));');
  assert.deepEqual(scan([poll, output('poll', JSON.stringify({ exit_code: 1, output: '' }))]), []);
  assert.deepEqual(scan([poll, output('poll', JSON.stringify({ exit_code: 0, output: '' }))]), ['use-modern-java']);
});

test('patch headers gate moves and deletions without treating added text as headers', () => {
  assert.match(decide({ tool_name: 'apply_patch', tool_input: '*** Begin Patch\n*** Delete File: src/main/java/Old.java\n*** End Patch' }, {}).block, /use-modern-java/);
  const patch = '*** Begin Patch\n*** Update File: notes.md\n*** Move to: notes2.md\n@@\n+*** Update File: Mention.java\n*** End Patch';
  assert.deepEqual(extractEdits('apply_patch', patch).map(item => item.path), ['notes.md', 'notes2.md']);
});
