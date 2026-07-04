import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
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
  await p.writeJson('package.json', { name: 'demo', version: '1.0.0', type: 'module' });
}

describe('CLI: rules', () => {
  it('lists all available packs as JSON', async () => {
    project = await createTempProject();
    await scaffold(project);

    const run = runAde('cliRules.ts', ['available', '--json'], project.dir);
    assert.equal(run.status, 0, run.stderr);
    const parsed = JSON.parse(run.stdout);
    const ids = parsed.packs.map((p: { id: string }) => p.id);
    assert.ok(ids.includes('backend/java'));
    assert.ok(ids.includes('frontend/next'));
  });

  it('lists active rules from the configured packs', async () => {
    project = await createTempProject();
    await scaffold(project);
    await project.writeJson('ade.config.json', { packs: ['development'] });

    const run = runAde('cliRules.ts', ['list', '--json'], project.dir);
    assert.equal(run.status, 0, run.stderr);
    const report = JSON.parse(run.stdout);
    assert.deepEqual(report.activePacks, ['development']);
    assert.ok(report.rules.some((r: { id: string }) => r.id === 'development/service-size'));
  });

  it('exits 1 when an activated pack does not exist', async () => {
    project = await createTempProject();
    await scaffold(project);
    await project.writeJson('ade.config.json', { packs: ['frontend/vue'] });

    const run = runAde('cliRules.ts', ['list', '--json'], project.dir);
    assert.equal(run.status, 1);
    const report = JSON.parse(run.stdout);
    assert.deepEqual(report.missingPacks, ['frontend/vue']);
  });

  it('review surfaces the deterministic service-size rule from an active pack', async () => {
    project = await createTempProject();
    await scaffold(project);
    await project.writeJson('ade.config.json', { packs: ['development'], thresholds: { serviceMaxLines: 50 } });
    await project.write('src/user.service.ts', `${Array.from({ length: 80 }, (_, i) => `const x${i}=${i};`).join('\n')}\n`);

    const run = runAde('cliReview.ts', ['--json'], project.dir);
    // warn-level finding → exit 0
    assert.equal(run.status, 0, run.stderr);
    const result = JSON.parse(run.stdout);
    assert.ok(result.findings.some((f: { rule: string }) => f.rule === 'development/service-size'));
  });
});
