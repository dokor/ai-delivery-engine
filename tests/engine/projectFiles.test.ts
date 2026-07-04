import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { listProjectFiles } from '../../src/engine/projectFiles.ts';
import { createTempProject, type TempProject } from '../helpers/tempProject.ts';

let project: TempProject | undefined;

afterEach(async () => {
  if (project) {
    await project.cleanup();
    project = undefined;
  }
});

describe('listProjectFiles', () => {
  it('lists files and prunes ignored directories, sorted', async () => {
    project = await createTempProject();
    await project.write('src/a.ts', '1');
    await project.write('src/b.ts', '2');
    await project.write('node_modules/pkg/index.js', '3');
    await project.write('dist/out.js', '4');

    const files = await listProjectFiles(project.dir, ['node_modules/**', 'dist/**']);

    assert.deepEqual(files, ['src/a.ts', 'src/b.ts']);
  });
});
