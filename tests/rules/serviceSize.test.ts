import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { checkServiceSize, countLines } from '../../src/rules/serviceSize.ts';
import { runDeterministicPackRules } from '../../src/rules/runRulePacks.ts';
import { emptyResolvedConfig } from '../../src/config/mergeConfig.ts';
import { listProjectFiles } from '../../src/engine/projectFiles.ts';
import { createTempProject, type TempProject } from '../helpers/tempProject.ts';

let project: TempProject | undefined;

afterEach(async () => {
  if (project) {
    await project.cleanup();
    project = undefined;
  }
});

function lines(n: number): string {
  return `${Array.from({ length: n }, (_, i) => `const x${i} = ${i};`).join('\n')}\n`;
}

describe('countLines', () => {
  it('counts lines without a phantom trailing line', () => {
    assert.equal(countLines(''), 0);
    assert.equal(countLines('a'), 1);
    assert.equal(countLines('a\nb\n'), 2);
    assert.equal(countLines('a\nb'), 2);
  });
});

describe('checkServiceSize', () => {
  it('flags matching files over the threshold and ignores others', async () => {
    project = await createTempProject();
    await project.write('src/user.service.ts', lines(300));
    await project.write('src/small.service.ts', lines(10));
    await project.write('src/helper.ts', lines(300)); // not a service → not matched

    const files = await listProjectFiles(project.dir, []);
    const findings = await checkServiceSize({
      cwd: project.dir,
      files,
      appliesTo: ['**/*service*.*'],
      maxLines: 250,
      severity: 'warn',
      ruleId: 'development/service-size'
    });

    assert.equal(findings.length, 1);
    assert.equal(findings[0].file, 'src/user.service.ts');
    assert.equal(findings[0].origin, 'deterministic');
  });

  it('respects a raised threshold', async () => {
    project = await createTempProject();
    await project.write('src/user.service.ts', lines(300));
    const files = await listProjectFiles(project.dir, []);

    const findings = await checkServiceSize({
      cwd: project.dir,
      files,
      appliesTo: ['**/*service*.*'],
      maxLines: 500,
      severity: 'warn',
      ruleId: 'development/service-size'
    });

    assert.equal(findings.length, 0);
  });
});

describe('runDeterministicPackRules', () => {
  it('runs the development service-size rule when the pack is active', async () => {
    project = await createTempProject();
    await project.write('src/services/big.service.ts', lines(300));
    const files = await listProjectFiles(project.dir, []);

    const config = { ...emptyResolvedConfig(), packs: ['development'], thresholds: { serviceMaxLines: 250 } };
    const findings = await runDeterministicPackRules({ cwd: project.dir, config, files });

    assert.ok(findings.some((f) => f.rule === 'development/service-size'));
  });

  it('produces nothing when no packs are active', async () => {
    project = await createTempProject();
    await project.write('src/services/big.service.ts', lines(300));
    const files = await listProjectFiles(project.dir, []);

    const findings = await runDeterministicPackRules({ cwd: project.dir, config: emptyResolvedConfig(), files });
    assert.equal(findings.length, 0);
  });
});
