#!/usr/bin/env node
/**
 * ADE CLI dispatcher — plain JavaScript entry point for the `ade` bin.
 *
 * Why plain JS? So the binary works without a build step when ADE is installed
 * as a devDependency. The dispatcher spawns Node.js with --experimental-strip-types
 * to run the target TypeScript file directly.
 *
 * Usage: ade <command> [args...]
 */

import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Maps CLI command names to their TypeScript entry point (relative to src/). */
const COMMANDS = {
  'backlog:run': 'index.ts',
  'backlog:review': 'reviewBacklog.ts',
  'backlog:export': 'exportBacklog.ts',
  'prompt:po': 'promptPo.ts',
  'prompt:specialist': 'promptSpecialist.ts',
  'prompt:specialists': 'promptSpecialists.ts',
  'import:po': 'importPo.ts',
  'specialist:check': 'specialistCheck.ts',
  'project:status': 'projectStatus.ts',
  'demo:validate': 'demoValidate.ts',
};

const [command, ...rest] = process.argv.slice(2);

if (!command || command === '--help' || command === '-h') {
  const names = Object.keys(COMMANDS).join('\n  ');
  console.log(`AI Delivery Engine (ade)\n\nAvailable commands:\n  ${names}\n`);
  process.exit(0);
}

const tsFile = COMMANDS[command];

if (!tsFile) {
  console.error(`ade: unknown command "${command}"`);
  console.error(`Run "ade --help" for available commands.`);
  process.exit(1);
}

const tsPath = resolve(__dirname, tsFile);

const child = spawn(
  process.execPath, // reuse the same node binary
  ['--experimental-strip-types', tsPath, ...rest],
  { stdio: 'inherit' }
);

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
