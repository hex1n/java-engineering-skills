#!/usr/bin/env node
// Compile compatibility examples and execute them on an explicit, existing JDK.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const usage = 'Usage: node scripts/check-examples.mjs --jdk <JDK home> [--release 8|11|17|21 ...]\nDefaults to all four targets. Uses an existing JDK; no toolchain is downloaded.';
function run(command, args, capture = false) {
  const result = spawnSync(command, args, {
    encoding: 'utf8', stdio: capture ? 'pipe' : 'inherit', timeout: 30_000,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${path.basename(command)} failed (${result.signal ?? result.status})${capture ? `: ${(result.stderr || result.stdout).trim()}` : ''}`);
  }
  return result;
}
let temporary;
try {
  const { values } = parseArgs({ options: {
    jdk: { type: 'string' }, release: { type: 'string', multiple: true },
    help: { type: 'boolean', short: 'h' },
  } });
  if (values.help) {
    console.log(usage);
  } else {
    if (!values.jdk) throw new Error(`--jdk is required\n${usage}`);
    const targets = values.release ?? ['8', '11', '17', '21'];
    if (targets.some(value => !['8', '11', '17', '21'].includes(value))) throw new Error(`Unsupported release\n${usage}`);
    const releases = [...new Set(targets.map(Number))];
    const suffix = process.platform === 'win32' ? '.exe' : '';
    const javac = path.resolve(values.jdk, 'bin', `javac${suffix}`);
    const java = path.resolve(values.jdk, 'bin', `java${suffix}`);
    const compiler = run(javac, ['-version'], true);
    const version = compiler.stdout.trim() || compiler.stderr.trim();
    const match = /javac (?:1\.)?(\d+)/.exec(version);
    if (!match) throw new Error(`Unrecognized compiler version: ${version}`);
    const major = Number(match[1]);
    if (Math.max(...releases) > major) throw new Error(`Compiler ${major} cannot target ${Math.max(...releases)}; select --release explicitly`);
    const runtime = run(java, ['-version'], true);
    console.log(`Compiler: ${version}`);
    console.log(`Execution runtime: ${(runtime.stderr || runtime.stdout).split(/\r?\n/)[0]}`);
    temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'java-guidelines-examples-'));
    for (const release of releases) {
      const out = path.join(temporary, String(release));
      fs.mkdirSync(out);
      const flags = major === 8 ? ['-source', '8', '-target', '8'] : ['--release', String(release)];
      const names = [`Java${release}Checks`, ...(release === 8 ? ['Java8FunctionalChecks'] : [])];
      for (const name of names) {
        run(javac, [...flags, '-encoding', 'UTF-8', '-d', out, path.join(ROOT, 'tests/examples', `${name}.java`)]);
        run(java, ['-cp', out, name]);
      }
    }
    console.log('PASS: target compatibility and selected behavior checks');
    console.log('Only the named execution runtime was exercised, not every target JDK.');
  }
} catch (error) {
  console.error(`FAIL: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (temporary) fs.rmSync(temporary, { recursive: true, force: true });
}
