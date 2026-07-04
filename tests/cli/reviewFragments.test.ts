import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
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

function git(cwd: string, args: string[]): number {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  return r.status ?? 1;
}

function runAde(entry: string, args: string[], cwd: string): { status: number; stdout: string; stderr: string } {
  const r = spawnSync(process.execPath, ['--experimental-strip-types', join(SRC_DIR, entry), ...args], {
    cwd,
    encoding: 'utf8'
  });
  return { status: r.status ?? -1, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}

describe('CLI: review --provider fragments (git-scoped)', () => {
  it('includes neighbour fragments imported by staged changed files', async (t) => {
    project = await createTempProject();
    await project.writeJson('package.json', { name: 'demo', version: '1.0.0', type: 'module' });
    await project.writeJson('ade.config.json', {});
    await project.write('src/shared.ts', 'export const shared = 1;\n');
    await project.write('src/main.ts', "import { shared } from './shared.ts';\nexport const main = shared;\n");

    if (
      git(project.dir, ['init', '-q']) !== 0 ||
      git(project.dir, ['config', 'user.email', 't@t.dev']) !== 0 ||
      git(project.dir, ['config', 'user.name', 'test']) !== 0 ||
      git(project.dir, ['add', '-A']) !== 0 ||
      git(project.dir, ['commit', '-qm', 'base']) !== 0
    ) {
      t.skip('git not available');
      return;
    }

    // Change only main.ts and stage it; shared.ts is its imported neighbour.
    await project.write('src/main.ts', "import { shared } from './shared.ts';\nexport const main = shared + 1;\n");
    git(project.dir, ['add', 'src/main.ts']);

    const run = runAde('cliReview.ts', ['--staged', '--provider', 'none'], project.dir);
    assert.equal(run.status, 0, run.stderr);

    const manifestPath = join(project.dir, 'outputs/context/context-pack.manifest.json');
    assert.ok(existsSync(manifestPath), 'pack manifest written');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

    assert.ok(
      manifest.included.some((i: { kind: string; ref: string }) => i.kind === 'fragment' && i.ref === 'src/shared.ts'),
      `expected shared.ts fragment, got ${JSON.stringify(manifest.included)}`
    );
  });
});
