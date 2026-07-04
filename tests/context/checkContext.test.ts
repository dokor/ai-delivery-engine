import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';

import { emptyResolvedConfig } from '../../src/config/mergeConfig.ts';
import { collectProjectContext } from '../../src/context/collectContext.ts';
import { writeContext } from '../../src/context/renderContext.ts';
import { checkContext } from '../../src/context/checkContext.ts';
import { createTempProject, type TempProject } from '../helpers/tempProject.ts';

let project: TempProject | undefined;

afterEach(async () => {
  if (project) {
    await project.cleanup();
    project = undefined;
  }
});

async function scaffold(p: TempProject): Promise<void> {
  await p.writeJson('package.json', { name: 'demo', version: '1.0.0', scripts: { test: 'node --test' } });
  await p.write('src/app/index.ts', 'export const x = 1;\n');
}

describe('checkContext', () => {
  it('reports absent when no context has been generated', async () => {
    project = await createTempProject();
    await scaffold(project);

    const result = await checkContext(project.dir, emptyResolvedConfig(), join(project.dir, 'outputs/context'));
    assert.equal(result.state, 'absent');
  });

  it('reports up-to-date right after generation', async () => {
    project = await createTempProject();
    await scaffold(project);
    const outDir = join(project.dir, 'outputs/context');
    const context = await collectProjectContext(project.dir, emptyResolvedConfig());
    await writeContext(context, outDir, project.dir);

    const result = await checkContext(project.dir, emptyResolvedConfig(), outDir);
    assert.equal(result.state, 'up-to-date');
  });

  it('reports stale after a source file changes', async () => {
    project = await createTempProject();
    await scaffold(project);
    const outDir = join(project.dir, 'outputs/context');
    const context = await collectProjectContext(project.dir, emptyResolvedConfig());
    await writeContext(context, outDir, project.dir);

    // add a new module → sources changed → fingerprint changes
    await project.write('src/added/new.ts', 'export const n = 1;\n');

    const result = await checkContext(project.dir, emptyResolvedConfig(), outDir);
    assert.equal(result.state, 'stale');
  });
});
