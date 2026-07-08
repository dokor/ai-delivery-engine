import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { parseBrief } from '../../src/briefs/briefParser.ts';
import { compileDeliveryPlan } from '../../src/blueprint/compiler.ts';
import { getReadyGraphNodeIds, validateDeliveryGraph } from '../../src/blueprint/graph.ts';

function brief(markdown: string) {
  return parseBrief(markdown, 'brief');
}

describe('compileDeliveryPlan', () => {
  it('selects the marketing-site blueprint and emits traceable graph nodes', () => {
    const plan = compileDeliveryPlan(
      brief(`# Cabinet site

## Summary
Site vitrine pour un cabinet avec pages publiques.

## Goals
- Publier un site clair

## Audience
- Prospects

## Scope
- home
- contact

## Success Criteria
- Le formulaire de contact fonctionne
`),
      'marketing.md'
    );

    assert.equal(plan.schemaVersion, 1);
    assert.equal(plan.selectedBlueprint.id, 'nextjs-vercel-marketing-site');
    assert.equal(plan.validation.valid, true);
    assert.deepEqual(getReadyGraphNodeIds(plan.graph, []), ['discover-scope']);
    assert.ok(plan.backlogTrace.every((trace) => plan.graph.some((node) => node.id === trace.nodeId)));
  });

  it('selects the SaaS blueprint for reservation/auth/data briefs', () => {
    const plan = compileDeliveryPlan(
      brief(`# Reservation SaaS

## Summary
SaaS de reservation avec dashboard et notifications.

## Goals
- Gerer les reservations

## Audience
- Administrateurs

## Scope
- auth
- reservation
- dashboard

## Constraints
- API Node.js
- database required

## Success Criteria
- Une reservation peut etre creee
`),
      'saas.md'
    );

    assert.equal(plan.selectedBlueprint.id, 'web-saas-node-or-java');
    assert.ok(plan.graph.some((node) => node.id === 'data-and-api-model'));
    assert.ok(plan.deliveryOrder.indexOf('architecture-spine') < plan.deliveryOrder.indexOf('data-and-api-model'));
  });

  it('preserves human decisions when recompiling', () => {
    const plan = compileDeliveryPlan(
      brief(`# Reservation SaaS

## Summary
SaaS de reservation.

## Goals
- Gerer les reservations

## Scope
- auth
- reservation

## Constraints
- API
`),
      'saas.md',
      [{ decisionId: 'architecture-stack', selectedOption: 'java-spring' }]
    );

    assert.equal(plan.decisions.find((decision) => decision.id === 'architecture-stack')?.status, 'accepted');
    assert.ok(plan.assumptions.some((assumption) => assumption.includes('architecture-stack = java-spring')));
    assert.ok(plan.graph.some((node) => node.title.includes('java-spring')));
  });

  it('validates unknown graph dependencies', () => {
    const plan = compileDeliveryPlan(brief('# Demo'), 'demo.md');
    const invalid = validateDeliveryGraph([
      ...plan.graph,
      {
        id: 'broken',
        title: 'Broken node',
        kind: 'validation',
        role: 'qa',
        dependsOn: ['missing-node'],
        inputs: [],
        outputs: [],
        artifacts: [],
        permissions: []
      }
    ]);

    assert.equal(invalid.valid, false);
    assert.ok(invalid.errors.some((error) => error.includes('missing-node')));
  });
});

