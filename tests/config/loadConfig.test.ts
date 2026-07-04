import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { resolveConfig, hasConfigErrors } from '../../src/config/loadConfig.ts';
import { createTempProject, type TempProject } from '../helpers/tempProject.ts';

let project: TempProject | undefined;

afterEach(async () => {
  if (project) {
    await project.cleanup();
    project = undefined;
  }
});

describe('resolveConfig', () => {
  it('returns built-in defaults with a warning when no config file exists (mono-repo root without config)', async () => {
    project = await createTempProject();
    const resolution = await resolveConfig({ cwd: project.dir });

    assert.equal(resolution.sources.length, 0);
    assert.equal(resolution.config.rules.length, 0);
    assert.ok(resolution.issues.some((i) => i.code === 'CONFIG_NOT_FOUND' && i.severity === 'warning'));
    assert.equal(hasConfigErrors(resolution), false);
  });

  it('loads a local config file and records provenance', async () => {
    project = await createTempProject();
    await project.writeJson('ade.config.json', {
      tools: ['test'],
      profiles: { ci: { mode: 'deterministic' } }
    });

    const resolution = await resolveConfig({ cwd: project.dir });

    assert.deepEqual(resolution.sources, ['ade.config.json']);
    assert.deepEqual(resolution.config.tools, ['test']);
    assert.equal(resolution.config.profiles.ci?.mode, 'deterministic');
    const toolsProvenance = resolution.provenance.find((p) => p.key === 'tools');
    assert.deepEqual(toolsProvenance?.sources, ['ade.config.json']);
  });

  it('merges presets before the root config (root wins on scalars, arrays union)', async () => {
    project = await createTempProject();
    await project.writeJson('presets/base.json', {
      ignore: ['dist/**'],
      profiles: { ci: { mode: 'assisted', allowProvider: true } }
    });
    await project.writeJson('ade.config.json', {
      extends: ['./presets/base.json'],
      ignore: ['node_modules/**'],
      profiles: { ci: { mode: 'deterministic' } }
    });

    const resolution = await resolveConfig({ cwd: project.dir });

    // preset first, root last
    assert.deepEqual(resolution.sources, ['presets/base.json', 'ade.config.json']);
    // arrays union across layers
    assert.deepEqual(resolution.config.ignore, ['dist/**', 'node_modules/**']);
    // root overrides scalar, preset field preserved
    assert.equal(resolution.config.profiles.ci?.mode, 'deterministic');
    assert.equal(resolution.config.profiles.ci?.allowProvider, true);
    // provenance shows both contributors for the profile
    const ciProvenance = resolution.provenance.find((p) => p.key === 'profiles.ci');
    assert.deepEqual(ciProvenance?.sources, ['presets/base.json', 'ade.config.json']);
  });

  it('detects an extends cycle instead of looping forever', async () => {
    project = await createTempProject();
    await project.writeJson('a.json', { extends: ['./b.json'], tools: ['a'] });
    await project.writeJson('b.json', { extends: ['./a.json'], tools: ['b'] });
    await project.writeJson('ade.config.json', { extends: ['./a.json'] });

    const resolution = await resolveConfig({ cwd: project.dir });

    assert.ok(resolution.issues.some((i) => i.code === 'EXTENDS_CYCLE'));
    assert.equal(hasConfigErrors(resolution), true);
  });

  it('reports a schema error for an unknown top-level key', async () => {
    project = await createTempProject();
    await project.writeJson('ade.config.json', { notAKey: true });

    const resolution = await resolveConfig({ cwd: project.dir });

    assert.ok(resolution.issues.some((i) => i.code === 'UNKNOWN_KEY' && i.path === 'notAKey'));
    assert.equal(hasConfigErrors(resolution), true);
  });

  it('reports a schema error for an invalid enum value', async () => {
    project = await createTempProject();
    await project.writeJson('ade.config.json', { profiles: { ci: { mode: 'turbo' } } });

    const resolution = await resolveConfig({ cwd: project.dir });

    assert.ok(resolution.issues.some((i) => i.code === 'INVALID_ENUM' && i.path === 'profiles.ci.mode'));
  });

  it('rejects secrets stored in the config file', async () => {
    project = await createTempProject();
    await project.writeJson('ade.config.json', {
      profiles: { agent: { allowProvider: true } },
      thresholds: {},
      // deliberately smuggled secret-like key
      // (nested to prove the deep scan works)
      context: { sources: [] }
    });
    // write a raw file with a secret key that JSON round-trips
    await project.write(
      'ade.config.json',
      JSON.stringify({ profiles: { agent: { apiKey: 'sk-test-123' } } }, null, 2)
    );

    const resolution = await resolveConfig({ cwd: project.dir });

    assert.ok(resolution.issues.some((i) => i.code === 'SECRET_IN_CONFIG'));
    assert.equal(hasConfigErrors(resolution), true);
  });

  it('is deterministic: identical result for repeated resolution (CLI/CI/MCP parity)', async () => {
    project = await createTempProject();
    await project.writeJson('presets/base.json', { tools: ['x'], ignore: ['dist/**'] });
    await project.writeJson('ade.config.json', {
      extends: ['./presets/base.json'],
      tools: ['y'],
      rules: [{ id: 'r1', severity: 'warn' }]
    });

    const first = await resolveConfig({ cwd: project.dir });
    const second = await resolveConfig({ cwd: project.dir });

    assert.deepEqual(first, second);
  });
});
