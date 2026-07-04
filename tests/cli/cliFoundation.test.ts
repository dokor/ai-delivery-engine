import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
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

describe('CLI: init', () => {
  it('creates ade.config.json, then is idempotent', async () => {
    project = await createTempProject();
    await scaffold(project);

    const first = runAde('cliInit.ts', [], project.dir);
    assert.equal(first.status, 0, first.stderr);
    assert.ok(existsSync(join(project.dir, 'ade.config.json')));

    const second = runAde('cliInit.ts', [], project.dir);
    assert.match(second.stdout, /already exists/);

    // created config is itself valid
    const validate = runAde('cliConfigValidate.ts', [], project.dir);
    assert.equal(validate.status, 0, validate.stdout);
  });

  it('--dry-run does not write the config', async () => {
    project = await createTempProject();
    await scaffold(project);

    const run = runAde('cliInit.ts', ['--dry-run'], project.dir);
    assert.equal(run.status, 0);
    assert.ok(!existsSync(join(project.dir, 'ade.config.json')));
  });
});

describe('CLI: doctor', () => {
  it('is healthy (exit 0) for a valid project', async () => {
    project = await createTempProject();
    await scaffold(project);
    await project.writeJson('ade.config.json', { tools: ['test'] });

    const run = runAde('cliDoctor.ts', [], project.dir);
    assert.equal(run.status, 0, run.stdout);
    assert.match(run.stdout, /Overall: healthy/);
  });

  it('fails (exit 1) when a configured tool has no npm script', async () => {
    project = await createTempProject();
    await scaffold(project);
    await project.writeJson('ade.config.json', { tools: ['lint'] });

    const run = runAde('cliDoctor.ts', [], project.dir);
    assert.equal(run.status, 1);
    assert.match(run.stdout, /problems found/);
  });
});

describe('CLI: review', () => {
  it('exits 0 with no error findings after context generation', async () => {
    project = await createTempProject();
    await scaffold(project);
    runAde('contextGenerate.ts', [], project.dir);

    const run = runAde('cliReview.ts', ['--json'], project.dir);
    assert.equal(run.status, 0, run.stdout);
    const result = JSON.parse(run.stdout);
    assert.equal(result.summary.error, 0);
    assert.equal(result.scope.kind, 'project');
  });

  it('exits 1 when the config has an error (secret)', async () => {
    project = await createTempProject();
    await scaffold(project);
    await project.write('ade.config.json', JSON.stringify({ profiles: { agent: { apiKey: 'x' } } }));

    const run = runAde('cliReview.ts', [], project.dir);
    assert.equal(run.status, 1);
  });

  it('reports a usage error (exit 2) for an unknown flag', async () => {
    project = await createTempProject();
    await scaffold(project);

    const run = runAde('cliReview.ts', ['--nope'], project.dir);
    assert.equal(run.status, 2);
  });
});

describe('CLI: fix', () => {
  it('--dry-run plans a context refresh without writing', async () => {
    project = await createTempProject();
    await scaffold(project);
    await project.writeJson('ade.config.json', {});

    const run = runAde('cliFix.ts', ['--dry-run'], project.dir);
    assert.equal(run.status, 0, run.stderr);
    assert.match(run.stdout, /would regenerate project context/);
    assert.ok(!existsSync(join(project.dir, 'outputs/context/context.json')));
  });

  it('applies fixes: generates the context', async () => {
    project = await createTempProject();
    await scaffold(project);
    await project.writeJson('ade.config.json', {});

    const run = runAde('cliFix.ts', [], project.dir);
    assert.equal(run.status, 0, run.stderr);
    assert.ok(existsSync(join(project.dir, 'outputs/context/context.json')));
  });
});
