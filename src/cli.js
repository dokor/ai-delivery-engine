#!/usr/bin/env node
/**
 * ADE CLI dispatcher — plain JavaScript entry point for the `ade` bin.
 *
 * Dispatches to compiled JS files in dist/ so the CLI works when ADE is
 * installed as a devDependency (Node 22 refuses --experimental-strip-types
 * for files under node_modules/).
 *
 * For local development, use the pnpm scripts (e.g. `pnpm backlog:run`)
 * which run TypeScript directly via --experimental-strip-types.
 *
 * Usage: ade <command> [args...]
 */

import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Maps CLI command names to their compiled JS entry point (relative to dist/). */
const COMMANDS = {
  'backlog:run':      'index.js',
  'backlog:review':   'reviewBacklog.js',
  'backlog:export':   'exportBacklog.js',
  'prompt:po':        'promptPo.js',
  'prompt:specialist': 'promptSpecialist.js',
  'prompt:specialists': 'promptSpecialists.js',
  'import:po':        'importPo.js',
  'specialist:check': 'specialistCheck.js',
  'project:status':   'projectStatus.js',
  'demo:validate':    'demoValidate.js',
  'config:print':     'configPrint.js',
  'context:generate': 'contextGenerate.js',
  'context:check':    'contextCheck.js',
  'context:print':    'contextPrint.js',
};

const [command, ...rest] = process.argv.slice(2);

if (!command || command === '--help' || command === '-h') {
  const names = Object.keys(COMMANDS).join('\n  ');
  console.log(`AI Delivery Engine (ade)\n\nAvailable commands:\n  ${names}\n`);
  process.exit(0);
}

const jsFile = COMMANDS[command];

if (!jsFile) {
  console.error(`ade: unknown command "${command}"`);
  console.error('Run "ade --help" for available commands.');
  process.exit(1);
}

// __dirname = <pkg>/src/  →  dist/ is one level up then down
const jsPath = resolve(__dirname, '..', 'dist', jsFile);

const child = spawn(
  process.execPath,
  [jsPath, ...rest],
  { stdio: 'inherit' }
);

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
