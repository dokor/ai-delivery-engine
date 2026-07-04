import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { emptyResolvedConfig } from '../../src/config/mergeConfig.ts';
import type { ResolvedAdeConfig } from '../../src/config/config.types.ts';
import { collectProjectContext } from '../../src/context/collectContext.ts';
import { renderContextMarkdown, contextToJson } from '../../src/context/renderContext.ts';
import { createTempProject, type TempProject } from '../helpers/tempProject.ts';

let project: TempProject | undefined;

afterEach(async () => {
  if (project) {
    await project.cleanup();
    project = undefined;
  }
});

function baseConfig(overrides: Partial<ResolvedAdeConfig> = {}): ResolvedAdeConfig {
  return { ...emptyResolvedConfig(), ...overrides };
}

async function scaffoldTypescriptProject(p: TempProject): Promise<void> {
  await p.writeJson('package.json', {
    name: 'demo-app',
    version: '1.0.0',
    type: 'module',
    engines: { node: '>=22' },
    scripts: { test: 'node --test', build: 'tsc' },
    devDependencies: { typescript: '^5.7.0' }
  });
  await p.write('src/app/index.ts', 'export const x = 1;\n');
  await p.write('src/utils/util.ts', 'export const y = 2;\n');
  await p.write('docs/DECISIONS/ADR-0001-example.md', '# ADR\n');
}

describe('collectProjectContext', () => {
  it('generates a stable fingerprint and identical output on an unchanged repo', async () => {
    project = await createTempProject();
    await scaffoldTypescriptProject(project);

    const config = baseConfig();
    const first = await collectProjectContext(project.dir, config);
    const second = await collectProjectContext(project.dir, config);

    assert.equal(first.fingerprint, second.fingerprint);
    assert.equal(contextToJson(first), contextToJson(second));
  });

  it('inventories stack, modules, commands and ADRs of a TypeScript project', async () => {
    project = await createTempProject();
    await scaffoldTypescriptProject(project);

    const context = await collectProjectContext(project.dir, baseConfig());

    assert.equal(context.stack.name, 'demo-app');
    assert.equal(context.stack.moduleType, 'module');
    assert.deepEqual(context.modules, ['src/app', 'src/utils']);
    assert.deepEqual(context.commands.map((c) => c.name), ['build', 'test']);
    assert.deepEqual(context.adrs, ['ADR-0001-example.md']);
  });

  it('excludes ignored modules from the inventory', async () => {
    project = await createTempProject();
    await scaffoldTypescriptProject(project);
    await project.write('src/generated/gen.ts', 'export const z = 3;\n');

    const context = await collectProjectContext(project.dir, baseConfig({ ignore: ['src/generated/**'] }));

    assert.ok(!context.modules.includes('src/generated'));
    assert.ok(context.modules.includes('src/app'));
  });

  it('never includes secret values or env contents in the output', async () => {
    project = await createTempProject();
    await scaffoldTypescriptProject(project);
    await project.write('.env', 'SECRET_TOKEN=super-secret-value\n');
    await project.write('src/config/keys.ts', 'export const KEY = "leak-me";\n');

    const context = await collectProjectContext(project.dir, baseConfig({ sensitive: ['.env*'] }));
    const serialized = contextToJson(context) + renderContextMarkdown(context);

    assert.ok(!serialized.includes('super-secret-value'));
    assert.ok(!serialized.includes('leak-me'));
  });

  it('customizes which sections render in Markdown', async () => {
    project = await createTempProject();
    await scaffoldTypescriptProject(project);

    const context = await collectProjectContext(project.dir, baseConfig({ context: { sections: ['stack'] } }));
    const markdown = renderContextMarkdown(context);

    assert.ok(markdown.includes('## Stack'));
    assert.ok(!markdown.includes('## Modules'));
  });

  it('changes the fingerprint when the config changes (cache invalidation signal)', async () => {
    project = await createTempProject();
    await scaffoldTypescriptProject(project);

    const a = await collectProjectContext(project.dir, baseConfig());
    const b = await collectProjectContext(project.dir, baseConfig({ rules: [{ id: 'r1' }] }));

    assert.notEqual(a.fingerprint, b.fingerprint);
  });
});
