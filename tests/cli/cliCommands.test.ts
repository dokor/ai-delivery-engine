import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

import { createTempProject, type TempProject } from '../helpers/tempProject.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = resolve(__dirname, '..', '..', 'src');

let project: TempProject | undefined;

afterEach(async () => {
  if (project) {
    await project.cleanup();
    project = undefined;
  }
});

/** Runs an ADE entry file in a separate Node process, like the real CLI. */
function runAde(entry: string, args: string[], cwd: string): { status: number; stdout: string; stderr: string } {
  const result = spawnSync(
    process.execPath,
    ['--experimental-strip-types', join(SRC_DIR, entry), ...args],
    { cwd, encoding: 'utf8' }
  );
  return { status: result.status ?? -1, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

async function scaffold(p: TempProject): Promise<void> {
  await p.writeJson('package.json', { name: 'demo', version: '1.0.0', type: 'module', scripts: { test: 'node --test' } });
  await p.write('src/app/index.ts', 'export const x = 1;\n');
}

describe('CLI: config:print', () => {
  it('exits 0 and writes a resolved config JSON for a valid config', async () => {
    project = await createTempProject();
    await scaffold(project);
    await project.writeJson('ade.config.json', { tools: ['test'], profiles: { ci: { mode: 'deterministic' } } });

    const run = runAde('configPrint.ts', [], project.dir);
    assert.equal(run.status, 0, run.stderr);

    const resolved = JSON.parse(readFileSync(join(project.dir, 'outputs/config/ade.config.resolved.json'), 'utf8'));
    assert.deepEqual(resolved.sources, ['ade.config.json']);
    assert.deepEqual(resolved.config.tools, ['test']);
  });

  it('exits 1 when the config contains a secret', async () => {
    project = await createTempProject();
    await scaffold(project);
    await project.write('ade.config.json', JSON.stringify({ profiles: { agent: { apiKey: 'sk-x' } } }));

    const run = runAde('configPrint.ts', [], project.dir);
    assert.equal(run.status, 1);
    assert.match(run.stdout, /SECRET_IN_CONFIG/);
  });
});

describe('CLI: context lifecycle', () => {
  it('generate (0) -> check up-to-date (0) -> print (0), and stale check (1) after a change', async () => {
    project = await createTempProject();
    await scaffold(project);

    const gen = runAde('contextGenerate.ts', [], project.dir);
    assert.equal(gen.status, 0, gen.stderr);

    const check = runAde('contextCheck.ts', [], project.dir);
    assert.equal(check.status, 0, check.stdout);
    assert.match(check.stdout, /State: up-to-date/);

    const print = runAde('contextPrint.ts', [], project.dir);
    assert.equal(print.status, 0);
    assert.match(print.stdout, /# Project Context/);

    await project.write('src/added/new.ts', 'export const n = 1;\n');
    const stale = runAde('contextCheck.ts', [], project.dir);
    assert.equal(stale.status, 1);
    assert.match(stale.stdout, /State: stale/);
  });

  it('context:check exits 2 (absent) before any generation', async () => {
    project = await createTempProject();
    await scaffold(project);

    const check = runAde('contextCheck.ts', [], project.dir);
    assert.equal(check.status, 2);
    assert.match(check.stdout, /State: absent/);
  });

  it('context:print exits 1 when no context exists yet', async () => {
    project = await createTempProject();
    await scaffold(project);

    const print = runAde('contextPrint.ts', [], project.dir);
    assert.equal(print.status, 1);
  });
});
