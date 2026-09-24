#!/usr/bin/env node
// Offline packaging and rule-reference checks using Node.js built-ins only.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

const ROOT = fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
const PLUGIN = path.join(ROOT, 'plugins/java-engineering-skills');
const SKILLS = path.join(PLUGIN, 'skills');
const SKILL = path.join(SKILLS, 'use-modern-java');
const read = file => fs.readFileSync(file, 'utf8').replace(/\r\n?/g, '\n');
const json = file => JSON.parse(read(file));
const require = (condition, message) => { if (!condition) throw new Error(message); };
const isFile = file => fs.existsSync(file) && fs.statSync(file).isFile();
const resolve = file => fs.existsSync(file) ? fs.realpathSync(file) : path.resolve(file);
const inside = (parent, child) => {
  const relative = path.relative(parent, child);
  return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
};
function* markdownFiles(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name === '.git') continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* markdownFiles(file);
    else if (entry.name.endsWith('.md')) yield file;
  }
}
const withoutFences = text => text.replace(/^```[^\n]*\n.*?^```\s*$/gms, '');
function anchors(text) {
  return new Set([...withoutFences(text).matchAll(/^#{1,6}\s+(.+)$/gm)]
    .map(([, title]) => title.toLowerCase().replace(/[^\p{L}\p{N}_\s-]/gu, '').replaceAll(' ', '-')));
}
function localLinks(file) {
  return [...withoutFences(read(file)).matchAll(/\[[^\]\n]+\]\(([^\s)]+)\)/g)]
    .map(match => match[1]).filter(target => !/^[a-z]+:\/\//.test(target));
}
function splitLink(target) {
  const hash = target.indexOf('#');
  return hash < 0 ? [target, ''] : [target.slice(0, hash), target.slice(hash + 1)];
}
function checkManifests() {
  const codex = json(path.join(PLUGIN, '.codex-plugin/plugin.json'));
  const claude = json(path.join(PLUGIN, '.claude-plugin/plugin.json'));
  for (const key of ['name', 'version', 'description', 'license', 'author']) {
    require(Object.hasOwn(codex, key) && Object.hasOwn(claude, key) && isDeepStrictEqual(codex[key], claude[key]), `Plugin metadata differs: ${key}`);
  }
  require(codex.name === path.basename(PLUGIN), 'Plugin directory/name mismatch');
  require(/^\d+\.\d+\.\d+$/.test(codex.version), 'Invalid version');
  require(codex.skills === './skills/', 'Unexpected skill root');
  require(isFile(path.join(ROOT, 'LICENSE')), 'Missing license file');
  require(fs.readFileSync(path.join(PLUGIN, 'LICENSE')).equals(fs.readFileSync(path.join(ROOT, 'LICENSE'))), 'Distributed plugin must include the repository license');
  const markets = ['.agents/plugins/marketplace.json', '.claude-plugin/marketplace.json'].map(file => json(path.join(ROOT, file)));
  require(markets[0].name === markets[1].name, 'Marketplace names differ');
  for (const market of markets) {
    require(Array.isArray(market.plugins) && market.plugins.length === 1, 'Expected one plugin');
    const entry = market.plugins[0];
    require(entry.name === path.basename(PLUGIN), 'Marketplace plugin name mismatch');
    let source = entry.source;
    if (source && typeof source === 'object') {
      require(source.source === 'local', 'Expected local plugin source');
      require(entry.policy?.installation === 'AVAILABLE', 'Unexpected installation policy');
      require(entry.policy?.authentication === 'ON_INSTALL', 'Unexpected authentication policy');
      require(entry.category === 'Developer Tools', 'Unexpected category');
      source = source.path;
    }
    require(typeof source === 'string' && source.startsWith('./'), 'Source path must be relative');
    require(resolve(path.resolve(ROOT, source)) === PLUGIN, 'Marketplace resolves to wrong plugin');
  }
}
function checkLinks(skillDirs) {
  let count = 0;
  for (const file of markdownFiles(ROOT)) {
    const owner = skillDirs.find(skill => inside(skill, file));
    for (const target of localLinks(file)) {
      const [filename, anchor] = splitLink(target);
      const resolved = resolve(filename ? path.resolve(path.dirname(file), filename) : file);
      require(inside(ROOT, resolved), `Link escapes repository: ${target}`);
      if (owner) require(inside(owner, resolved), `Skill link escapes package: ${target}`);
      require(isFile(resolved), `Missing link target: ${resolved}`);
      if (anchor) require(anchors(read(resolved)).has(anchor), `Missing anchor: ${target}`);
      count++;
    }
  }
  return count;
}
function checkSkills() {
  const dirs = fs.readdirSync(SKILLS).map(name => path.join(SKILLS, name)).filter(dir => fs.statSync(dir).isDirectory()).sort();
  require(dirs.length, 'No skills packaged');
  for (const skill of dirs) {
    const name = path.basename(skill);
    const entry = path.join(skill, 'SKILL.md');
    require(isFile(entry), `Missing skill entry: ${name}`);
    const text = read(entry);
    const frontmatter = /^---\n(.*?)\n---(?:\n|$)/s.exec(text);
    require(frontmatter, `Missing frontmatter: ${name}`);
    require(frontmatter[1].split('\n').includes(`name: ${name}`), `Skill name differs from directory: ${name}`);
    require(/^description: \S.+$/m.test(frontmatter[1]), `Missing description: ${name}`);
    require(!text.includes('[TODO:'), `Unfinished skill scaffold: ${name}`);
    const documents = new Set(markdownFiles(skill));
    const reached = new Set();
    const pending = [entry];
    while (pending.length) {
      const file = pending.pop();
      if (reached.has(file)) continue;
      reached.add(file);
      for (const link of localLinks(file)) {
        const [filename] = splitLink(link);
        const target = resolve(filename ? path.resolve(path.dirname(file), filename) : file);
        if (documents.has(target) && !reached.has(target)) pending.push(target);
      }
    }
    const orphaned = [...documents].filter(file => !reached.has(file));
    require(!orphaned.length, `Unreachable skill references: ${orphaned.map(file => path.relative(skill, file)).sort().join(', ')}`);
  }
  return dirs;
}
function checkRules() {
  const rows = [...read(path.join(SKILL, 'SKILL.md')).matchAll(/^\| (\d+) \| \[([^\]]+)\]\(([^)#]+)#([^)]+)\) \|/gm)].map(match => match.slice(1));
  require(rows.length, 'Empty rule index');
  const ids = rows.map(row => row[1]);
  require(new Set(ids).size === ids.length, 'Duplicate rule ID');
  const versions = rows.map(row => Number(row[0]));
  require(versions.every((version, i) => i === 0 || versions[i - 1] >= version), 'Index must be newest first');
  const documented = new Set();
  for (const filename of fs.readdirSync(SKILL).filter(name => /^JAVA.*\.md$/.test(name)).sort()) {
    for (const section of read(path.join(SKILL, filename)).split(/^## /m).slice(1)) {
      const newline = section.indexOf('\n');
      const id = (newline < 0 ? section : section.slice(0, newline)).trim();
      const body = newline < 0 ? '' : section.slice(newline + 1);
      require(!documented.has(id), `Duplicate rule detail: ${id}`);
      documented.add(id);
      const row = rows.find(item => item[1] === id);
      require(row, `Unindexed rule: ${id}`);
      const [version, , target, anchor] = row;
      require(target === filename && anchor === id, `Misrouted rule: ${id}`);
      require(Number(version) >= 8 && Number(version) <= 21, `Out-of-scope Java version: ${version}`);
      require(body.includes(`**Minimum: Java ${version}.**`), `Version mismatch: ${id}`);
      require(body.includes('```java'), `Missing example: ${id}`);
      require(/https:\/\/(?:openjdk\.org|docs\.oracle\.com)\//.test(body), `Missing primary source: ${id}`);
    }
  }
  require(documented.size === ids.length && ids.every(id => documented.has(id)), 'Index and rule details differ');
  const entry = read(path.join(SKILL, 'SKILL.md'));
  require(entry.startsWith('---\nname: use-modern-java\ndescription: '), 'Invalid skill frontmatter');
  require(!entry.includes('[TODO:'), 'Unfinished skill scaffold');
  return rows.length;
}
try {
  checkManifests();
  const skills = checkSkills();
  const links = checkLinks(skills);
  const rules = checkRules();
  console.log('PASS: Codex and Claude plugin/marketplace paths and metadata');
  console.log(`PASS: ${skills.length} independently contained skills; all Markdown references reachable`);
  console.log(`PASS: ${links} local links; ${rules} versioned rules with examples and sources`);
  console.log('Scope: offline structure checks; no agent behavior or Java compilation executed');
} catch (error) {
  console.error(`FAIL: ${error.message}`);
  process.exitCode = 1;
}
