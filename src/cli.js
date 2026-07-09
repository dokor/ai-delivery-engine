#!/usr/bin/env node
/**
 * ADE CLI dispatcher — plain JavaScript entry point for the `ade` bin.
 *
 * Dispatches to compiled JS files in dist/ so the CLI works when ADE is
 * installed as a devDependency (Node 22 refuses --experimental-strip-types
 * for files under node_modules/).
 *
 * Command syntax: `ade <group> <action>` (canonical, e.g. `ade config print`)
 * plus top-level commands (`ade init`, `ade review`). Legacy colon forms
 * (`ade config:print`) remain supported for backward compatibility.
 *
 * For local development, use the pnpm scripts (e.g. `pnpm backlog:run`).
 */

import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Command name (space-grouped or colon legacy) → compiled JS entry in dist/. */
const COMMANDS = {
  // Setup / diagnostics
  init: 'cliInit.js',
  doctor: 'cliDoctor.js',
  upgrade: 'cliUpgrade.js',
  // Configuration
  'config validate': 'cliConfigValidate.js',
  'config print': 'configPrint.js',
  // Context
  'context generate': 'contextGenerate.js',
  'context check': 'contextCheck.js',
  'context print': 'contextPrint.js',
  'context pack': 'contextPack.js',
  'harness demo': 'harnessDemo.js',
  'blueprint compile': 'blueprintCompile.js',
  'delivery close': 'deliveryClose.js',
  'run observe': 'runObserve.js',
  'quality gate': 'qualityGate.js',
  // Review / fix / rules
  review: 'cliReview.js',
  fix: 'cliFix.js',
  rules: 'cliRules.js',
  // Backlog
  'backlog:run': 'index.js',
  'backlog:review': 'reviewBacklog.js',
  'backlog:export': 'exportBacklog.js',
  // Prompts / import / specialist
  'prompt:po': 'promptPo.js',
  'prompt:specialist': 'promptSpecialist.js',
  'prompt:specialists': 'promptSpecialists.js',
  'import:po': 'importPo.js',
  'specialist:check': 'specialistCheck.js',
  // Status / demo
  'project:status': 'projectStatus.js',
  'demo:validate': 'demoValidate.js',
  // Legacy colon aliases for grouped commands
  'config:print': 'configPrint.js',
  'context:generate': 'contextGenerate.js',
  'context:check': 'contextCheck.js',
  'context:print': 'contextPrint.js',
  'context:pack': 'contextPack.js',
  'harness:demo': 'harnessDemo.js',
  'blueprint:compile': 'blueprintCompile.js',
  'delivery:close': 'deliveryClose.js',
  'run:observe': 'runObserve.js',
  'quality:gate': 'qualityGate.js',
};

const HELP = `AI Delivery Engine (ade)

Usage: ade <command> [options]

Setup & diagnostics:
  ade init [--dry-run]            create ade.config.json with defaults
  ade doctor                      diagnose Node, config, tools and context
  ade upgrade                     show the installed version and how to upgrade

Configuration:
  ade config validate [path]      validate the resolved configuration
  ade config print [path] [out]   print + write the resolved configuration

Context:
  ade context generate [out]      generate the project context
  ade context check [out]         absent | up-to-date | stale (no writes)
  ade context print [out]         print the stored context
  ade context pack [mode] [diff]  build a budgeted context pack (chill|normal|expert)
  ade harness demo                run a deterministic Delivery Harness demo
  ade blueprint compile [brief]   compile a brief into a delivery blueprint/graph
  ade delivery close [run] [out]  close a run into delivery dossier artifacts
  ade run observe [run] [out]     render observable run timeline, budget and controls
  ade quality gate [input] [out]  evaluate staging/production quality gate evidence

Review:
  ade review [--staged|--base <ref>] [--run-tools] [--provider <name>] [--json]
  ade fix [--dry-run]             apply safe, mechanical fixes
  ade rules [list|available] [--json]  list active rule packs / rules

Backlog & prompts:
  ade backlog:run | backlog:review | backlog:export
  ade prompt:po | prompt:specialist | prompt:specialists | import:po
  ade specialist:check | project:status | delivery:close | run:observe | quality:gate | demo:validate

Exit codes are documented in docs/CLI.md.`;

const argv = process.argv.slice(2);
const first = argv[0];

if (!first || first === '--help' || first === '-h' || first === 'help') {
  console.log(HELP);
  process.exit(0);
}

if (first === '--version' || first === '-v') {
  // Defer to the upgrade command's version reporting for a single source of truth.
  argv[0] = 'upgrade';
}

// Resolve the longest matching command: try "<group> <action>" then "<token>".
let jsFile;
let commandArgs;
const twoWord = argv.length >= 2 ? `${argv[0]} ${argv[1]}` : undefined;

if (twoWord && COMMANDS[twoWord]) {
  jsFile = COMMANDS[twoWord];
  commandArgs = argv.slice(2);
} else if (COMMANDS[argv[0]]) {
  jsFile = COMMANDS[argv[0]];
  commandArgs = argv.slice(1);
}

if (!jsFile) {
  console.error(`ade: unknown command "${argv.join(' ')}"`);
  console.error('Run "ade --help" for available commands.');
  process.exit(1);
}

const jsPath = resolve(__dirname, '..', 'dist', jsFile);

const child = spawn(process.execPath, [jsPath, ...commandArgs], { stdio: 'inherit' });

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
