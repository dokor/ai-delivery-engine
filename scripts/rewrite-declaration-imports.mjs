#!/usr/bin/env node
/**
 * TypeScript preserves explicit `.ts` specifiers in declaration output. The
 * published package only contains compiled `.js` modules, so convert relative
 * declaration specifiers to their runtime-equivalent `.js` paths.
 */

import { readFile, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const declarationsRoot = resolve(scriptDir, '..', 'dist');
const declarationSpecifier = /(['"])(\.\.?\/[^'"]+)\.ts\1/g;

async function declarationFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await declarationFiles(fullPath));
    } else if (entry.name.endsWith('.d.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

const files = await declarationFiles(declarationsRoot);
let rewritten = 0;

for (const file of files) {
  const source = await readFile(file, 'utf8');
  const output = source.replace(declarationSpecifier, '$1$2.js$1');
  if (output !== source) {
    await writeFile(file, output, 'utf8');
    rewritten++;
  }
}

console.log(`Rewrote relative TypeScript specifiers in ${rewritten} declaration files.`);
