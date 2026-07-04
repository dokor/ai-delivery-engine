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
  await p.writeJson('ade.config.json', { rules: [{ id: 'r1', description: 'a rule' }] });
  await p.write('changes.diff', '+ added line in src/app/index.ts\n');
}

function readManifest(dir: string): { mode: string; budget: number; included: Array<{ kind: string }>; cacheHit: boolean; estimateIsIndicative: boolean } {
  return JSON.parse(readFileSync(join(dir, 'outputs/context/context-pack.manifest.json'), 'utf8'));
}

describe('CLI: context:pack', () => {
  it('builds a normal pack with a transparent manifest and a cache miss then hit', async () => {
    project = await createTempProject();
    await scaffold(project);

    const first = runAde('contextPack.ts', ['normal', 'changes.diff'], project.dir);
    assert.equal(first.status, 0, first.stderr);
    assert.match(first.stdout, /Cache: miss/);

    const manifest = readManifest(project.dir);
    assert.equal(manifest.mode, 'normal');
    assert.equal(manifest.budget, 12000);
    assert.equal(manifest.estimateIsIndicative, true);
    assert.ok(manifest.included.some((i) => i.kind === 'diff'));
    assert.ok(manifest.included.some((i) => i.kind === 'context'));
    assert.ok(manifest.included.some((i) => i.kind === 'rules'));

    const second = runAde('contextPack.ts', ['normal', 'changes.diff'], project.dir);
    assert.equal(second.status, 0);
    assert.match(second.stdout, /Cache: hit/);
  });

  it('uses a smaller budget in chill mode than in expert mode', async () => {
    project = await createTempProject();
    await scaffold(project);

    runAde('contextPack.ts', ['chill', 'changes.diff'], project.dir);
    assert.equal(readManifest(project.dir).budget, 4000);

    runAde('contextPack.ts', ['expert', 'changes.diff'], project.dir);
    assert.equal(readManifest(project.dir).budget, 32000);
  });

  it('defaults to normal mode when none is given', async () => {
    project = await createTempProject();
    await scaffold(project);

    const run = runAde('contextPack.ts', [], project.dir);
    assert.equal(run.status, 0, run.stderr);
    assert.equal(readManifest(project.dir).mode, 'normal');
  });
});
