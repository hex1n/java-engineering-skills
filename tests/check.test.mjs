import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS = 'plugins/java-engineering-skills/skills';
function fixture(t) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'java-plugin-check-'));
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
  const root = path.join(temp, 'repo with spaces');
  fs.cpSync(ROOT, root, { recursive: true, filter: source => !['.git', 'node_modules', '.tmp'].includes(path.basename(source)) });
  return root;
}
function check(root) {
  const result = spawnSync(process.execPath, [path.join(root, 'scripts/check.mjs')], {
    encoding: 'utf8', cwd: os.tmpdir(), timeout: 30_000,
  });
  assert.ifError(result.error);
  return result;
}
function rejected(root, expected) {
  const result = check(root);
  assert.equal(result.status, 1, result.stdout);
  assert.match(result.stderr, expected);
}
function edit(root, file, transform) {
  const target = path.join(root, file);
  fs.writeFileSync(target, transform(fs.readFileSync(target, 'utf8')));
}

test('current package passes from another working directory and a path with spaces', t => {
  const result = check(fixture(t));
  assert.equal(result.status, 0, result.stderr);
});
test('CRLF Markdown preserves frontmatter, index and reference checks', t => {
  const root = fixture(t);
  for (const name of ['SKILL.md', 'JAVA8-FUNCTIONAL.md']) {
    edit(root, `${SKILLS}/use-modern-java/${name}`, text => text.replace(/\r?\n/g, '\r\n'));
  }
  const result = check(root);
  assert.equal(result.status, 0, result.stderr);
});
test('skills cannot depend on sibling references', t => {
  const root = fixture(t);
  edit(root, `${SKILLS}/java-design/SKILL.md`, text => `${text}\n[Required material](../java-concurrency/TASKS.md)\n`);
  rejected(root, /Skill link escapes package/);
});
test('unlinked references are rejected', t => {
  const root = fixture(t);
  fs.writeFileSync(path.join(root, SKILLS, 'redis-engineering/UNUSED.md'), '# Forgotten guidance\n');
  rejected(root, /Unreachable skill references/);
});
test('non-modern-Java entries are validated', t => {
  const root = fixture(t);
  edit(root, `${SKILLS}/messaging-reliability/SKILL.md`, text => text.replace('name: messaging-reliability', 'name: unrelated'));
  rejected(root, /Skill name differs/);
});
test('links inside nested references are checked', t => {
  const root = fixture(t);
  edit(root, `${SKILLS}/spring-boot-engineering/CONFIGURATION.md`, text => `${text}\n[Details](MISSING.md)\n`);
  rejected(root, /Missing link target/);
});
test('manifest object values must match, independent of property ordering', t => {
  const root = fixture(t);
  const manifest = 'plugins/java-engineering-skills/.claude-plugin/plugin.json';
  edit(root, manifest, text => {
    const value = JSON.parse(text);
    value.author = Object.fromEntries(Object.entries(value.author).reverse());
    return JSON.stringify(value);
  });
  assert.equal(check(root).status, 0);
  edit(root, manifest, text => {
    const value = JSON.parse(text);
    value.author.name = 'Different author';
    return JSON.stringify(value);
  });
  rejected(root, /Plugin metadata differs: author/);
});
test('missing anchors are rejected while links in code fences are ignored', t => {
  const root = fixture(t);
  edit(root, `${SKILLS}/java-design/SKILL.md`, text => `${text}\n\x60\x60\x60md\n[Example](MISSING.md)\n\x60\x60\x60\n`);
  assert.equal(check(root).status, 0);
  edit(root, `${SKILLS}/java-design/SKILL.md`, text => `${text}\n[Details](PATTERNS.md#missing-anchor)\n`);
  rejected(root, /Missing anchor/);
});
test('a rule must retain its declared Java baseline and primary source', t => {
  const root = fixture(t);
  const file = `${SKILLS}/use-modern-java/JAVA8-FUNCTIONAL.md`;
  const original = fs.readFileSync(path.join(root, file), 'utf8');
  edit(root, file, text => text.replace('**Minimum: Java 8.**', '**Minimum: Java 11.**'));
  rejected(root, /Version mismatch/);
  fs.writeFileSync(path.join(root, file), original.replaceAll('https://docs.oracle.com/', 'https://example.com/'));
  rejected(root, /Missing primary source/);
});
