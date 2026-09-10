#!/usr/bin/env node
/**
 * Verifies that the publishable npm archive contains the public type entrypoints.
 * Run through `pnpm pack:check`, which builds first so the check describes the
 * package consumers receive rather than an unbuilt working tree.
 */

import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptDir, '..');
const isWindows = process.platform === 'win32';
const npmCommand = isWindows ? (process.env.ComSpec ?? 'cmd.exe') : 'npm';
const npmArgs = isWindows
  ? ['/d', '/s', '/c', 'npm pack --dry-run --json']
  : ['pack', '--dry-run', '--json'];

const output = execFileSync(npmCommand, npmArgs, {
  cwd: packageRoot,
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'inherit']
});

const parsedPack = JSON.parse(output);
// npm <= 10 serializes `npm pack --json` as an array, while npm 11 emits the
// single pack result as an object. Accept both forms because this guard runs in
// the publishing workflow, which intentionally uses the current npm CLI.
const pack = Array.isArray(parsedPack) ? parsedPack[0] : parsedPack;
if (!pack || !Array.isArray(pack.files)) {
  throw new TypeError('npm pack --dry-run --json returned an unexpected archive description.');
}
const packedFiles = new Set(pack.files.map(({ path }) => path));
const requiredFiles = ['dist/api.d.ts', 'dist/mcp/stdio.d.ts'];
const missingFiles = requiredFiles.filter((file) => !packedFiles.has(file));
const declarationSpecifiers = await Promise.all(requiredFiles.map(async (file) => ({
  file,
  source: await readFile(resolve(packageRoot, file), 'utf8')
})));
const declarationsWithTsImports = declarationSpecifiers
  .filter(({ source }) => /['"]\.\.?\/[^'"]+\.ts['"]/.test(source))
  .map(({ file }) => file);

if (missingFiles.length > 0 || declarationsWithTsImports.length > 0) {
  if (missingFiles.length > 0) {
    console.error(`npm package is missing type declarations: ${missingFiles.join(', ')}`);
  }
  if (declarationsWithTsImports.length > 0) {
    console.error(`npm package declarations retain .ts imports: ${declarationsWithTsImports.join(', ')}`);
  }
  process.exitCode = 1;
} else {
  // Resolve the public declarations with NodeNext semantics, matching a modern
  // TypeScript consumer of this ESM package.
  execFileSync(process.execPath, [
    'node_modules/typescript/bin/tsc',
    '--noEmit',
    '--module', 'NodeNext',
    '--moduleResolution', 'NodeNext',
    '--target', 'ES2022',
    '--skipLibCheck',
    ...requiredFiles
  ], {
    cwd: packageRoot,
    stdio: 'inherit'
  });
  console.log(`npm package contains public type declarations: ${requiredFiles.join(', ')}`);
}
