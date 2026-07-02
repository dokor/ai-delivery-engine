#!/usr/bin/env node
/**
 * ADE build script — compiles src/*.ts → dist/*.js
 *
 * Uses TypeScript's transpileModule API (already a devDependency, zero extra deps).
 * Mirrors the full src/ directory structure into dist/.
 *
 * Run: node scripts/build.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, rmSync } from 'node:fs';
import { resolve, join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(__dirname, '..');
const require = createRequire(import.meta.url);

// Use the project's own TypeScript (already in devDependencies). A bare
// specifier lets Node's resolution find it regardless of the install layout
// (pnpm symlinks, hoisting, monorepo hoisted node_modules, …).
// NOTE: requires TypeScript >= 5.7 for `rewriteRelativeImportExtensions`.
const ts = require('typescript');

const SRC_DIR = join(pkgRoot, 'src');
const DIST_DIR = join(pkgRoot, 'dist');

// Compiler options for transpilation
const COMPILER_OPTIONS = {
  module: ts.ModuleKind.ESNext,       // ESM output
  target: ts.ScriptTarget.ES2022,     // modern JS, compatible with Node 22+
  rewriteRelativeImportExtensions: true, // rewrite .ts → .js in imports (TS 5.7+)
  verbatimModuleSyntax: true,         // strip import type, keep value imports
  strict: true,
};

/** Find all .ts files in a directory, excluding test and declaration files. */
function findTsFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...findTsFiles(full));
    } else if (
      entry.endsWith('.ts') &&
      !entry.endsWith('.test.ts') &&
      !entry.endsWith('.d.ts')
    ) {
      results.push(full);
    }
  }
  return results;
}

// Clean and recreate dist/
rmSync(DIST_DIR, { recursive: true, force: true });
mkdirSync(DIST_DIR, { recursive: true });

const tsFiles = findTsFiles(SRC_DIR);
let count = 0;

for (const tsFile of tsFiles) {
  const source = readFileSync(tsFile, 'utf-8');

  const result = ts.transpileModule(source, {
    compilerOptions: COMPILER_OPTIONS,
    fileName: tsFile,
    reportDiagnostics: true,
  });

  // transpileModule doesn't type-check (that's `pnpm typecheck`), but it does
  // report syntax errors. Fail loudly rather than emit broken JS.
  if (result.diagnostics?.length) {
    for (const d of result.diagnostics) {
      const msg = ts.flattenDiagnosticMessageText(d.messageText, '\n');
      console.error(`${relative(pkgRoot, tsFile)}: ${msg}`);
    }
    process.exit(1);
  }

  // Mirror src/ structure in dist/
  const relPath = relative(SRC_DIR, tsFile).replace(/\.ts$/, '.js');
  const outPath = join(DIST_DIR, relPath);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, result.outputText, 'utf-8');
  count++;
}

console.log(`Build complete: ${count} files → dist/`);
