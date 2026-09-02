import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { realpath } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { evaluateProjectSetup } from '../../src/setup/evaluate.ts';
import {
  getProjectSetupContract,
  getSetupRequirements,
  getSetupTemplate,
  projectSetupContractToJson
} from '../../src/setup/requirements.ts';
import { PROJECT_SETUP_CONTRACT_VERSION } from '../../src/setup/setup.types.ts';
import { collectProjectContext } from '../../src/context/collectContext.ts';
import { writeContext } from '../../src/context/renderContext.ts';
import { resolveConfig } from '../../src/config/loadConfig.ts';
import { defaultConfigJson } from '../../src/config/defaultConfig.ts';
import { createTempProject, type TempProject } from '../helpers/tempProject.ts';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const AT = '2026-09-01T10:00:00.000Z';

let project: TempProject | undefined;

afterEach(async () => {
  if (project) {
    await project.cleanup();
    project = undefined;
  }
});

/** A repository that satisfies every locally checkable required requirement. */
async function readyProject(): Promise<string> {
  project = await createTempProject();
  const root = await realpath(project.dir);

  await project.writeJson('package.json', {
    name: 'ready-demo',
    version: '1.0.0',
    scripts: { test: 'node --test' }
  });
  await project.write('src/app/index.ts', 'export const x = 1;\n');
  await project.write('README.md', '# Ready demo\n');
  await project.write('CLAUDE.md', '# Agent instructions\n');
  await project.write('docs/GUIDE.md', '# Guide\n');
  await project.write('docs/DECISIONS/ADR-0001.md', '# ADR 1\n');
  await project.write(
    'ade.config.json',
    `${JSON.stringify({ ...JSON.parse(defaultConfigJson()), packs: ['development'], issueLifecycle: { enrichment: { enabled: true, profile: 'local' }, deliveryPlan: { implementationProfile: 'local', reviewProfiles: ['ci'] } } }, null, 2)}\n`
  );

  // Generate the project context so `context.generated` is satisfied.
  const resolution = await resolveConfig({ cwd: root });
  const context = await collectProjectContext(root, resolution.config);
  await writeContext(context, resolve(root, 'outputs/context'), root);

  return root;
}

/** A repository with nothing but a package.json. */
async function bareProject(): Promise<string> {
  project = await createTempProject();
  await project.writeJson('package.json', { name: 'bare-demo', version: '1.0.0' });
  return realpath(project.dir);
}

describe('project setup contract', () => {
  it('is versioned and independent of any repository', () => {
    const contract = getProjectSetupContract();

    assert.equal(contract.version, PROJECT_SETUP_CONTRACT_VERSION);
    assert.equal(contract.version, 'ade.project-setup/v1');
    assert.equal(typeof contract.adeVersion, 'string');
    assert.ok(contract.requirements.length > 10);
  });

  it('gives every requirement a criticality, a scope and a remediation', () => {
    for (const requirement of getSetupRequirements()) {
      assert.ok(
        ['required', 'recommended', 'optional'].includes(requirement.criticality),
        `${requirement.id} criticality`
      );
      assert.ok(['local', 'github'].includes(requirement.scope), `${requirement.id} scope`);
      assert.ok(requirement.remediation.length > 10, `${requirement.id} remediation`);
      assert.ok(requirement.description.length > 20, `${requirement.id} description`);
    }
  });

  it('uses stable, unique requirement ids', () => {
    const ids = getSetupRequirements().map((requirement) => requirement.id);
    assert.equal(new Set(ids).size, ids.length, 'requirement ids must be unique');
  });

  it('declares the workflow labels and the issue templates', () => {
    const contract = getProjectSetupContract();

    for (const expected of ['backlog-refined', 'ready-for-dev', 'in-progress', 'pr-ready']) {
      assert.ok(
        contract.githubLabels.some((label) => label.name === expected && label.criticality === 'required'),
        `${expected} must be a required workflow label`
      );
    }
    assert.ok(contract.issueTemplates.length > 0);
  });

  it('lists the rule packs shipped by this ADE version', () => {
    const contract = getProjectSetupContract();
    assert.ok(contract.availableRulePacks.some((pack) => pack.id === 'development'));
    for (const pack of contract.availableRulePacks) {
      assert.ok(pack.ruleCount > 0, `${pack.id} must declare its rule count`);
    }
  });

  it('owns the templates rather than expecting a consumer to copy them', () => {
    const contract = getProjectSetupContract();
    const templated = contract.requirements.filter((requirement) => requirement.template);

    assert.ok(templated.length > 0);
    for (const requirement of templated) {
      const body = getSetupTemplate(requirement.template?.id ?? '');
      assert.ok(body && body.length > 0, `${requirement.id} template must resolve to content`);
    }
  });

  it('serialises to stable JSON', () => {
    assert.equal(
      projectSetupContractToJson(getProjectSetupContract()),
      projectSetupContractToJson(getProjectSetupContract())
    );
  });

  it('returns undefined for an unknown template id', () => {
    assert.equal(getSetupTemplate('nope'), undefined);
  });
});

describe('evaluating a ready repository', () => {
  it('reports ready when every required requirement is met', async () => {
    const root = await readyProject();
    const evaluation = await evaluateProjectSetup({ projectRoot: root, generatedAt: AT });

    assert.equal(
      evaluation.readiness,
      'ready',
      `expected ready, missing: ${evaluation.missingRequiredIds.join(', ')}`
    );
    assert.deepEqual(evaluation.missingRequiredIds, []);
    assert.deepEqual(evaluation.missingExecutionCapabilityIds, []);
    assert.ok(evaluation.executionCapabilities.every((capability) => capability.status === 'available'));
    assert.deepEqual(evaluation.configurationErrors, []);
    assert.equal(evaluation.generatedAt, AT);
  });

  it('does not let unmet optional requirements block readiness', async () => {
    const root = await readyProject();
    const evaluation = await evaluateProjectSetup({ projectRoot: root, generatedAt: AT });

    // No issue templates exist in the temp project: they are optional or
    // recommended, so they must not change the verdict.
    assert.ok(evaluation.missingOptionalIds.length > 0);
    assert.equal(evaluation.readiness, 'ready');
  });
});

describe('evaluating an incomplete repository', () => {
  it('reports incomplete and names every missing required requirement', async () => {
    const root = await bareProject();
    const evaluation = await evaluateProjectSetup({ projectRoot: root, generatedAt: AT });

    assert.equal(evaluation.readiness, 'incomplete');
    assert.ok(evaluation.missingRequiredIds.includes('config.ade-config'));
    assert.ok(evaluation.missingRequiredIds.includes('context.generated'));
  });

  it('offers a remediation and an ADE template for what is missing', async () => {
    const root = await bareProject();
    const evaluation = await evaluateProjectSetup({ projectRoot: root, generatedAt: AT });

    const config = evaluation.requirements.find((requirement) => requirement.id === 'config.ade-config');
    assert.equal(config?.status, 'unsatisfied');
    assert.match(config?.remediation ?? '', /ade init/);
    assert.equal(config?.template?.id, 'ade.config.json');
    assert.ok(getSetupTemplate(config?.template?.id ?? '')?.includes('"ignore"'));
  });

  it('drops the remediation once a requirement is satisfied', async () => {
    const root = await readyProject();
    const evaluation = await evaluateProjectSetup({ projectRoot: root, generatedAt: AT });

    const config = evaluation.requirements.find((requirement) => requirement.id === 'config.ade-config');
    assert.equal(config?.status, 'satisfied');
    assert.equal(config?.remediation, undefined);
    assert.equal(config?.template, undefined);
  });
});

describe('GitHub requirements ADE cannot observe', () => {
  it('reports labels as unverifiable rather than missing', async () => {
    const root = await bareProject();
    const evaluation = await evaluateProjectSetup({ projectRoot: root, generatedAt: AT });

    const label = evaluation.requirements.find(
      (requirement) => requirement.id === 'github.label.backlog-refined'
    );
    assert.equal(label?.status, 'unverifiable');
    assert.match(label?.detail ?? '', /cannot read repository labels/);
    assert.ok(evaluation.unverifiableIds.includes('github.label.backlog-refined'));

    // An unverifiable requirement must never be counted as missing.
    assert.ok(!evaluation.missingRequiredIds.includes('github.label.backlog-refined'));
  });

  it('evaluates labels once the caller supplies what it observed', async () => {
    const root = await bareProject();
    const evaluation = await evaluateProjectSetup({
      projectRoot: root,
      generatedAt: AT,
      observedGithubLabels: ['backlog-refined', 'ready-for-dev']
    });

    const present = evaluation.requirements.find(
      (requirement) => requirement.id === 'github.label.backlog-refined'
    );
    const absent = evaluation.requirements.find(
      (requirement) => requirement.id === 'github.label.in-progress'
    );

    assert.equal(present?.status, 'satisfied');
    assert.equal(absent?.status, 'unsatisfied');
    assert.ok(evaluation.missingRequiredIds.includes('github.label.in-progress'));
  });

  it('never leaves a supplied label list unverifiable', async () => {
    const root = await bareProject();
    const evaluation = await evaluateProjectSetup({
      projectRoot: root,
      generatedAt: AT,
      observedGithubLabels: []
    });

    const labelIds = evaluation.requirements
      .filter((requirement) => requirement.kind === 'github-label')
      .map((requirement) => requirement.status);
    assert.ok(!labelIds.includes('unverifiable'));
  });
});

describe('evaluating a repository with a broken configuration', () => {
  it('reports invalid, and says readiness cannot be assessed', async () => {
    project = await createTempProject();
    await project.writeJson('package.json', { name: 'broken', version: '1.0.0' });
    // A secret-like key is a configuration error by design.
    await project.write('ade.config.json', `${JSON.stringify({ apiKey: 'sk-not-a-real-key' }, null, 2)}\n`);
    const root = await realpath(project.dir);

    const evaluation = await evaluateProjectSetup({ projectRoot: root, generatedAt: AT });

    assert.equal(evaluation.readiness, 'invalid');
    assert.ok(evaluation.configurationErrors.length > 0);
    assert.match(evaluation.markdown, /Readiness cannot be assessed/);
  });
});

describe('evaluation output', () => {
  it('is stable across two runs for the same repository', async () => {
    const root = await readyProject();

    const first = await evaluateProjectSetup({ projectRoot: root, generatedAt: AT });
    const second = await evaluateProjectSetup({ projectRoot: root, generatedAt: AT });

    assert.equal(JSON.stringify(first), JSON.stringify(second));
  });

  it('renders markdown that states the verdict and what to fix', async () => {
    const root = await bareProject();
    const evaluation = await evaluateProjectSetup({ projectRoot: root, generatedAt: AT });

    assert.match(evaluation.markdown, /# ADE project setup/);
    assert.match(evaluation.markdown, /Readiness: \*\*incomplete\*\*/);
    assert.match(evaluation.markdown, /## Unsatisfied/);
    assert.match(evaluation.markdown, /## Not verifiable locally/);
    assert.match(evaluation.markdown, /fix: /);
  });

  it('evaluates this very repository without throwing', async () => {
    const evaluation = await evaluateProjectSetup({ projectRoot: REPO_ROOT, generatedAt: AT });

    assert.ok(['ready', 'incomplete', 'invalid'].includes(evaluation.readiness));
    assert.equal(evaluation.version, PROJECT_SETUP_CONTRACT_VERSION);
    assert.deepEqual(evaluation.configurationErrors, []);
  });
});
