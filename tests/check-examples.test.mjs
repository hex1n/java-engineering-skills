import { test } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const script = fileURLToPath(new URL('../scripts/check-examples.mjs', import.meta.url));
for (const [name, args, status, message] of [
  ['help needs no JDK', ['--help'], 0, /Usage:/],
  ['JDK must be explicit', [], 1, /--jdk is required/],
  ['unsupported targets are rejected before invoking a JDK', ['--jdk', '/unused', '--release', '9'], 1, /Unsupported release/],
  ['unknown options are rejected', ['--unknown'], 1, /Unknown option/],
  ['missing toolchain reports failure', ['--jdk', script, '--release', '8'], 1, /FAIL:/],
]) {
  test(name, () => {
    const result = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', cwd: os.tmpdir(), timeout: 30_000 });
    assert.ifError(result.error);
    assert.equal(result.status, status, result.stderr);
    assert.match(result.stdout + result.stderr, message);
  });
}
