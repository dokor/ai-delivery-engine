import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { extractFragments, extractImportSpecifiers, resolveLocalImport } from '../../src/contextpack/fragments.ts';
import { createTempProject, type TempProject } from '../helpers/tempProject.ts';

let project: TempProject | undefined;

afterEach(async () => {
  if (project) {
    await project.cleanup();
    project = undefined;
  }
});

describe('extractImportSpecifiers', () => {
  it('finds import, export-from, bare import and require specifiers', () => {
    const specs = extractImportSpecifiers(
      [
        "import { a } from './a.ts';",
        "export { b } from './b.ts';",
        "import './side-effect.ts';",
        "const c = require('./c.js');",
        "import x from 'left-pad';"
      ].join('\n')
    );
    assert.ok(specs.includes('./a.ts'));
    assert.ok(specs.includes('./b.ts'));
    assert.ok(specs.includes('./side-effect.ts'));
    assert.ok(specs.includes('./c.js'));
    assert.ok(specs.includes('left-pad'));
  });
});

describe('resolveLocalImport', () => {
  it('resolves relative specifiers to existing files and ignores packages', async () => {
    project = await createTempProject();
    await project.write('src/a.ts', 'export const a = 1;');
    await project.write('src/util/index.ts', 'export const u = 1;');

    assert.equal(resolveLocalImport('src/main.ts', './a', project.dir), 'src/a.ts');
    assert.equal(resolveLocalImport('src/main.ts', './util', project.dir), 'src/util/index.ts');
    assert.equal(resolveLocalImport('src/main.ts', 'react', project.dir), undefined);
    assert.equal(resolveLocalImport('src/main.ts', './missing', project.dir), undefined);
  });
});

describe('extractFragments', () => {
  it('collects imported neighbours ranked by reference count, capped by max', async () => {
    project = await createTempProject();
    await project.write('src/shared.ts', 'export const s = 1;');
    await project.write('src/only.ts', 'export const o = 1;');
    await project.write('src/a.ts', "import { s } from './shared.ts';\nimport { o } from './only.ts';\n");
    await project.write('src/b.ts', "import { s } from './shared.ts';\n");

    const fragments = await extractFragments({
      cwd: project.dir,
      seedFiles: ['src/a.ts', 'src/b.ts'],
      maxFragments: 5
    });

    // shared.ts referenced by 2 seeds → ranked first
    assert.equal(fragments[0].ref, 'src/shared.ts');
    assert.ok(fragments.some((f) => f.ref === 'src/only.ts'));
    assert.ok(fragments.every((f) => f.kind === 'fragment'));
  });

  it('excludes seed files themselves and sensitive files', async () => {
    project = await createTempProject();
    await project.write('src/secret.ts', 'export const KEY = "x";');
    await project.write('src/a.ts', "import './secret.ts';\nimport './a.ts';\n");

    const fragments = await extractFragments({
      cwd: project.dir,
      seedFiles: ['src/a.ts'],
      maxFragments: 5,
      sensitivePatterns: ['**/secret.ts']
    });

    assert.ok(!fragments.some((f) => f.ref === 'src/secret.ts'));
    assert.ok(!fragments.some((f) => f.ref === 'src/a.ts'));
  });

  it('respects the maxFragments cap and returns nothing when zero', async () => {
    project = await createTempProject();
    await project.write('src/one.ts', 'export const a = 1;');
    await project.write('src/two.ts', 'export const b = 1;');
    await project.write('src/a.ts', "import './one.ts';\nimport './two.ts';\n");

    const capped = await extractFragments({ cwd: project.dir, seedFiles: ['src/a.ts'], maxFragments: 1 });
    assert.equal(capped.length, 1);

    const none = await extractFragments({ cwd: project.dir, seedFiles: ['src/a.ts'], maxFragments: 0 });
    assert.equal(none.length, 0);
  });
});
