import assert from 'node:assert/strict';
import test from 'node:test';

import { DELIVERY_PLAN_CONTRACT_VERSION, planDelivery } from '../src/github/deliveryPlan.ts';
import type { ResolvedAdeConfig } from '../src/config/config.types.ts';

const issue = (body: string, labels: string[] = []) => ({ number: 152, title: 'Expose delivery plan', body, labels, state: 'open' as const, url: 'https://github.com/dokor/ai-delivery-engine/issues/152' });

function configuration(): ResolvedAdeConfig {
  return {
    ignore: [], sensitive: [], tools: [], packs: ['development'], context: {}, thresholds: {}, output: {},
    profiles: {
      implementation: { mode: 'assisted', context: 'full', allowProvider: true },
      security: { mode: 'assisted', context: 'compact', allowProvider: true },
      qa: { mode: 'deterministic', context: 'compact' }
    },
    rules: [
      { id: 'security/no-secrets', severity: 'error', appliesTo: ['src/**'] },
      { id: 'quality/tests', severity: 'warn' }
    ],
    issueLifecycle: {
      deliveryPlan: {
        implementationProfile: 'implementation',
        reviewProfiles: ['security', 'qa'],
        validationRuleIds: ['security/no-secrets'],
        maxCorrectionAttempts: 2
      }
    }
  };
}

test('returns a versioned repository-owned plan with bounded correction and human gates', () => {
  const result = planDelivery({
    issue: issue('## Objective\nShip it\n\n## Acceptance criteria\n- [ ] A\n- [ ] B\n- [ ] C'),
    configuration: configuration(),
    negotiation: { acceptedVersions: [DELIVERY_PLAN_CONTRACT_VERSION], requiredCapabilities: ['specialist-review'] },
    provenance: { configSources: ['ade.config.json'], configKeys: ['issueLifecycle.deliveryPlan', 'profiles.security'] }
  });

  assert.equal(result.status, 'supported');
  if (result.status !== 'supported') return;
  assert.equal(result.plan.lifecycle.action, 'develop');
  assert.equal(result.plan.implementation.profile, 'implementation');
  assert.deepEqual(result.plan.validations.map((validation) => validation.ruleId), ['security/no-secrets']);
  assert.deepEqual(result.plan.reviews.map((review) => review.profile), ['security', 'qa']);
  assert.equal(result.plan.correction.maximumAttempts, 2);
  assert.equal(result.plan.humanGates.find((gate) => gate.id === 'approve-publication')?.required, true);
  assert.equal(result.plan.publication.ready, false);
  assert.deepEqual(result.plan.provenance.profileIds, ['implementation', 'security', 'qa']);
});

test('does not use issue keywords to select specialist reviews', () => {
  const result = planDelivery({
    issue: issue('Security vulnerability in deployment pipeline.\n\n## Objective\nFix it\n\n- [ ] A\n- [ ] B\n- [ ] C'),
    configuration: {
      ...configuration(),
      issueLifecycle: { deliveryPlan: { implementationProfile: 'implementation', reviewProfiles: ['qa'] } }
    }
  });

  assert.equal(result.status, 'supported');
  if (result.status !== 'supported') return;
  assert.deepEqual(result.plan.reviews.map((review) => review.profile), ['qa']);
});

test('reports an exact negotiation or policy incompatibility instead of guessing', () => {
  const noVersion = planDelivery({ issue: issue('x'), configuration: configuration(), negotiation: { acceptedVersions: ['ade.delivery-plan/v2'] } });
  assert.equal(noVersion.status, 'unsupported');
  assert.equal(noVersion.reason.code, 'NO_MUTUAL_CONTRACT_VERSION');

  const noPolicy = planDelivery({ issue: issue('x'), configuration: { ...configuration(), issueLifecycle: {} } });
  assert.equal(noPolicy.status, 'unsupported');
  assert.equal(noPolicy.reason.code, 'MISSING_DELIVERY_PLAN_POLICY');
});
