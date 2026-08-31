import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { advanceProjectRun, parseProjectRunSnapshot } from '../../src/projectRun/advance.ts';
import type { ProjectRunReport } from '../../src/projectRun/projectRun.types.ts';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const AT = '2026-08-31T10:00:00.000Z';

type Raw = Record<string, unknown>;

/**
 * A three-node run: `scope` is already validated, `design` depends on it and
 * carries a decision, `build` depends on `design` and carries a security gate.
 * Small enough to reason about, rich enough to exercise every transition.
 */
function snapshot(overrides: Raw = {}): Raw {
  return {
    schemaVersion: 1,
    runId: 'run-1',
    projectName: 'Demo',
    status: 'awaiting_decision',
    nodes: [
      { id: 'scope', title: 'Scope', role: 'po-pm', status: 'completed', dependsOn: [] },
      { id: 'design', title: 'Design', role: 'tech-lead', status: 'awaiting_decision', dependsOn: ['scope'] },
      { id: 'build', title: 'Build', role: 'backend', status: 'pending', dependsOn: ['design'] }
    ],
    decisions: [
      {
        id: 'd1',
        nodeId: 'design',
        question: 'Which storage?',
        status: 'pending',
        options: [
          { id: 'sql', label: 'PostgreSQL' },
          { id: 'kv', label: 'Redis' }
        ]
      }
    ],
    gates: [{ id: 'g1', nodeId: 'build', kind: 'security', status: 'pending' }],
    actors: [
      {
        id: 'human',
        kind: 'human',
        permissions: ['control_run', 'decide', 'override_gate', 'takeover']
      },
      { id: 'agent', kind: 'agent', permissions: ['control_run'] }
    ],
    requestedActions: [],
    ...overrides
  };
}

function advance(overrides: Raw = {}): ProjectRunReport {
  return advanceProjectRun(parseProjectRunSnapshot(snapshot(overrides)), AT);
}

function action(overrides: Raw): Raw {
  return { id: 'a1', actorId: 'human', reason: 'because', ...overrides };
}

function auditFor(report: ProjectRunReport, actionId: string) {
  const entry = report.audit.find((candidate) => candidate.id === actionId);
  assert.ok(entry, `no audit entry for "${actionId}"`);
  return entry;
}

describe('parseProjectRunSnapshot', () => {
  it('accepts the shipped fixture', async () => {
    const raw = JSON.parse(
      await readFile(join(REPO_ROOT, 'src/examples/sample-project-run.json'), 'utf8')
    ) as unknown;

    const parsed = parseProjectRunSnapshot(raw);
    assert.equal(parsed.runId, 'run-checkout-revamp');
    assert.equal(parsed.nodes.length, 5);
    assert.equal(parsed.requestedActions.length, 3);
  });

  it('refuses an unknown schema version', () => {
    assert.throws(() => parseProjectRunSnapshot(snapshot({ schemaVersion: 2 })), /schemaVersion/);
  });

  it('refuses a run with no node', () => {
    assert.throws(() => parseProjectRunSnapshot(snapshot({ nodes: [] })), /must not be empty/);
  });

  it('refuses a dependency on an unknown node', () => {
    const nodes = [{ id: 'a', title: 'A', role: 'r', status: 'pending', dependsOn: ['ghost'] }];
    assert.throws(
      () => parseProjectRunSnapshot(snapshot({ nodes, decisions: [], gates: [] })),
      /depends on unknown node "ghost"/
    );
  });

  it('refuses a decision attached to an unknown node', () => {
    const decisions = [
      { id: 'd', nodeId: 'ghost', question: 'q', status: 'pending', options: [{ id: 'o', label: 'O' }] }
    ];
    assert.throws(() => parseProjectRunSnapshot(snapshot({ decisions })), /unknown node "ghost"/);
  });

  it('refuses a gate attached to an unknown node', () => {
    const gates = [{ id: 'g', nodeId: 'ghost', kind: 'security', status: 'pending' }];
    assert.throws(() => parseProjectRunSnapshot(snapshot({ gates })), /unknown node "ghost"/);
  });

  it('refuses duplicate node ids', () => {
    const nodes = [
      { id: 'a', title: 'A', role: 'r', status: 'pending' },
      { id: 'a', title: 'A again', role: 'r', status: 'pending' }
    ];
    assert.throws(
      () => parseProjectRunSnapshot(snapshot({ nodes, decisions: [], gates: [] })),
      /duplicate node id "a"/
    );
  });

  it('refuses a decision with no option', () => {
    const decisions = [{ id: 'd', nodeId: 'design', question: 'q', status: 'pending', options: [] }];
    assert.throws(() => parseProjectRunSnapshot(snapshot({ decisions })), /options" must not be empty/);
  });

  it('refuses a recommendation that is not among the options', () => {
    const decisions = [
      {
        id: 'd',
        nodeId: 'design',
        question: 'q',
        status: 'pending',
        recommendedOptionId: 'nope',
        options: [{ id: 'o', label: 'O' }]
      }
    ];
    assert.throws(() => parseProjectRunSnapshot(snapshot({ decisions })), /recommendedOptionId/);
  });

  it('refuses an unknown status', () => {
    assert.throws(() => parseProjectRunSnapshot(snapshot({ status: 'vibing' })), /must be one of/);
  });
});

describe('next node selection', () => {
  it('offers no next node while a decision is pending', () => {
    const report = advance();

    assert.equal(report.nextNode, undefined);
    assert.equal(report.status, 'awaiting_decision');
    assert.equal(report.blocker.kind, 'decision');
    assert.equal(report.blocker.decisionId, 'd1');
    assert.deepEqual(report.pendingDecisionIds, ['d1']);
    assert.equal(report.resumable, false);
  });

  it('selects the earliest ready node in dependency order', () => {
    const report = advance({
      status: 'ready',
      decisions: [],
      gates: [],
      nodes: [
        { id: 'zeta', title: 'Zeta', role: 'r', status: 'pending', dependsOn: ['alpha'] },
        { id: 'alpha', title: 'Alpha', role: 'r', status: 'pending', dependsOn: [] }
      ]
    });

    assert.equal(report.nextNode?.id, 'alpha');
    assert.equal(report.status, 'ready');
    assert.equal(report.blocker.kind, 'none');
    assert.equal(report.resumable, true);
  });

  it('reports the earliest obstacle, not the furthest gate', () => {
    // `build` carries a gate, but it is three steps away: naming that gate would
    // make the run look gated when it is simply waiting on a decision.
    const report = advance();

    assert.equal(report.blocker.kind, 'decision');
    const build = report.nodes.find((node) => node.id === 'build');
    assert.equal(build?.status, 'pending');
    assert.match(build?.blockedReason ?? '', /Waiting on "design"/);
  });
});

describe('decisions', () => {
  it('approving unblocks the node and records the chosen option', () => {
    const report = advance({
      requestedActions: [action({ type: 'approve_decision', decisionId: 'd1', optionId: 'sql' })]
    });

    assert.deepEqual(report.acceptedActionIds, ['a1']);
    assert.equal(report.nextNode?.id, 'design');
    assert.equal(report.status, 'ready');

    const decision = report.decisions[0];
    assert.equal(decision.status, 'approved');
    assert.equal(decision.selectedOptionId, 'sql');
    assert.equal(decision.answeredBy, 'human');
    assert.equal(decision.answeredAt, AT);
    assert.equal(decision.rationale, 'because');
  });

  it('refuses an option the decision does not offer', () => {
    const report = advance({
      requestedActions: [action({ type: 'approve_decision', decisionId: 'd1', optionId: 'carrier-pigeon' })]
    });

    assert.deepEqual(report.refusedActionIds, ['a1']);
    assert.match(auditFor(report, 'a1').detail, /is not offered by decision "d1"/);
    assert.equal(report.decisions[0].status, 'pending');
  });

  it('refuses an approval with no option at all', () => {
    const report = advance({
      requestedActions: [action({ type: 'approve_decision', decisionId: 'd1' })]
    });

    assert.deepEqual(report.refusedActionIds, ['a1']);
    assert.match(auditFor(report, 'a1').detail, /must name the chosen "optionId"/);
  });

  it('refuses to answer a decision twice', () => {
    const report = advance({
      requestedActions: [
        action({ id: 'a1', type: 'approve_decision', decisionId: 'd1', optionId: 'sql' }),
        action({ id: 'a2', type: 'approve_decision', decisionId: 'd1', optionId: 'kv' })
      ]
    });

    assert.deepEqual(report.acceptedActionIds, ['a1']);
    assert.deepEqual(report.refusedActionIds, ['a2']);
    assert.match(auditFor(report, 'a2').detail, /already approved/);
    assert.equal(report.decisions[0].selectedOptionId, 'sql');
  });

  it('rejecting blocks the node and requires replanning', () => {
    const report = advance({
      requestedActions: [action({ type: 'reject_decision', decisionId: 'd1' })]
    });

    assert.deepEqual(report.acceptedActionIds, ['a1']);
    assert.equal(report.replanRequired, true);
    assert.equal(report.status, 'blocked');
    assert.equal(report.nextNode, undefined);

    const design = report.nodes.find((node) => node.id === 'design');
    assert.equal(design?.status, 'blocked');
    assert.match(design?.blockedReason ?? '', /needs replanning/);
    assert.equal(report.blocker.kind, 'decision');
    assert.equal(report.blocker.nodeId, 'design');
  });

  it('refuses a decision id that does not exist', () => {
    const report = advance({
      requestedActions: [action({ type: 'approve_decision', decisionId: 'ghost', optionId: 'sql' })]
    });

    assert.match(auditFor(report, 'a1').detail, /Unknown decision "ghost"/);
  });
});

describe('permissions', () => {
  it('refuses a decision from an actor without the decide permission', () => {
    const report = advance({
      requestedActions: [
        action({ type: 'approve_decision', actorId: 'agent', decisionId: 'd1', optionId: 'sql' })
      ]
    });

    assert.deepEqual(report.refusedActionIds, ['a1']);
    assert.match(auditFor(report, 'a1').detail, /lacks the "decide" permission/);
    assert.equal(report.decisions[0].status, 'pending');
  });

  it('refuses a gate override from an actor without the override permission', () => {
    const report = advance({
      requestedActions: [action({ type: 'override_gate', actorId: 'agent', gateId: 'g1' })]
    });

    assert.deepEqual(report.refusedActionIds, ['a1']);
    assert.match(auditFor(report, 'a1').detail, /lacks the "override_gate" permission/);
    assert.equal(report.gates[0].status, 'pending');
  });

  it('refuses an unknown actor', () => {
    const report = advance({
      requestedActions: [action({ type: 'pause', actorId: 'nobody' })]
    });

    assert.match(auditFor(report, 'a1').detail, /Unknown actor "nobody"/);
  });

  it('records a refusal in the audit rather than dropping it', () => {
    const report = advance({
      requestedActions: [action({ type: 'override_gate', actorId: 'agent', gateId: 'g1' })]
    });

    const entry = auditFor(report, 'a1');
    assert.equal(entry.outcome, 'refused');
    assert.equal(entry.actorId, 'agent');
    assert.equal(entry.reason, 'because');
    assert.equal(entry.at, AT);
  });
});

describe('gates', () => {
  it('an override is applied, attributed and justified', () => {
    const report = advance({
      requestedActions: [
        action({ type: 'approve_decision', decisionId: 'd1', optionId: 'sql' }),
        action({ id: 'a2', type: 'override_gate', gateId: 'g1', reason: 'Pentest done out of band.' })
      ]
    });

    const gate = report.gates[0];
    assert.equal(gate.status, 'overridden');
    assert.equal(gate.approvedBy, 'human');
    assert.equal(gate.approvedAt, AT);
    assert.equal(gate.reason, 'Pentest done out of band.');
    assert.match(auditFor(report, 'a2').detail, /overridden by human/);
  });

  it('refuses to override a gate that is already settled', () => {
    const report = advance({
      gates: [{ id: 'g1', nodeId: 'build', kind: 'security', status: 'approved' }],
      requestedActions: [action({ type: 'override_gate', gateId: 'g1' })]
    });

    assert.deepEqual(report.refusedActionIds, ['a1']);
    assert.match(auditFor(report, 'a1').detail, /already approved/);
  });

  it('blocks a node on its own gate once its dependencies are met', () => {
    const report = advance({
      status: 'ready',
      decisions: [],
      nodes: [
        { id: 'scope', title: 'Scope', role: 'po-pm', status: 'completed' },
        { id: 'build', title: 'Build', role: 'backend', status: 'pending', dependsOn: ['scope'] }
      ]
    });

    const build = report.nodes.find((node) => node.id === 'build');
    assert.equal(build?.status, 'blocked');
    assert.match(build?.blockedReason ?? '', /Gate "g1" \(security\) is pending/);
    assert.equal(report.blocker.kind, 'gate');
    assert.equal(report.blocker.gateId, 'g1');
  });
});

describe('pause, resume and cancel', () => {
  it('pausing stops the run from offering a next node', () => {
    const report = advance({
      requestedActions: [
        action({ type: 'approve_decision', decisionId: 'd1', optionId: 'sql' }),
        action({ id: 'a2', type: 'pause' })
      ]
    });

    assert.equal(report.status, 'paused');
    assert.equal(report.nextNode, undefined);
    assert.equal(report.resumable, false);
    assert.equal(report.blocker.kind, 'paused');
  });

  it('refuses to pause an already paused run', () => {
    const report = advance({
      status: 'paused',
      requestedActions: [action({ type: 'pause' })]
    });

    assert.deepEqual(report.refusedActionIds, ['a1']);
    assert.match(auditFor(report, 'a1').detail, /already paused/);
  });

  it('resuming restores next-node selection', () => {
    const report = advance({
      status: 'paused',
      requestedActions: [
        action({ type: 'approve_decision', decisionId: 'd1', optionId: 'sql' }),
        action({ id: 'a2', type: 'resume' })
      ]
    });

    assert.deepEqual(report.acceptedActionIds, ['a1', 'a2']);
    assert.equal(report.nextNode?.id, 'design');
    assert.equal(report.resumable, true);
  });

  it('refuses to resume a run that is not paused', () => {
    const report = advance({ requestedActions: [action({ type: 'resume' })] });

    assert.deepEqual(report.refusedActionIds, ['a1']);
    assert.match(auditFor(report, 'a1').detail, /not paused/);
  });

  it('cancelling preserves validated nodes and cancels the rest', () => {
    const report = advance({ requestedActions: [action({ type: 'cancel' })] });

    assert.equal(report.status, 'cancelled');
    assert.deepEqual(report.preservedNodeIds, ['scope']);
    assert.equal(report.nodes.find((node) => node.id === 'scope')?.status, 'completed');
    assert.equal(report.nodes.find((node) => node.id === 'design')?.status, 'cancelled');
    assert.equal(report.blocker.kind, 'cancelled');
  });

  it('refuses every action once the run is terminal', () => {
    const report = advance({
      requestedActions: [
        action({ type: 'cancel' }),
        action({ id: 'a2', type: 'approve_decision', decisionId: 'd1', optionId: 'sql' })
      ]
    });

    assert.deepEqual(report.acceptedActionIds, ['a1']);
    assert.deepEqual(report.refusedActionIds, ['a2']);
    assert.match(auditFor(report, 'a2').detail, /terminal run/);
  });
});

describe('retry and takeover', () => {
  it('retrying a failed node requeues it and counts the attempt', () => {
    const report = advance({
      status: 'failed',
      decisions: [],
      gates: [],
      nodes: [
        { id: 'scope', title: 'Scope', role: 'po-pm', status: 'completed' },
        { id: 'design', title: 'Design', role: 'tech-lead', status: 'failed', dependsOn: ['scope'], attemptCount: 2 }
      ],
      requestedActions: [action({ type: 'retry', nodeId: 'design' })]
    });

    const design = report.nodes.find((node) => node.id === 'design');
    assert.equal(design?.status, 'ready');
    assert.equal(design?.attemptCount, 3);
    assert.equal(report.nextNode?.id, 'design');
    assert.equal(report.status, 'ready');
  });

  it('lets a human act on a failed run: failure is recoverable, not terminal', () => {
    const report = advance({
      status: 'failed',
      decisions: [],
      gates: [],
      nodes: [
        { id: 'scope', title: 'Scope', role: 'po-pm', status: 'completed' },
        { id: 'design', title: 'Design', role: 'tech-lead', status: 'failed', dependsOn: ['scope'] }
      ],
      requestedActions: [action({ type: 'takeover', nodeId: 'design' })]
    });

    assert.deepEqual(report.acceptedActionIds, ['a1']);
    assert.notEqual(report.status, 'failed');
  });

  it('refuses to retry a validated node', () => {
    const report = advance({
      requestedActions: [action({ type: 'retry', nodeId: 'scope' })]
    });

    assert.deepEqual(report.refusedActionIds, ['a1']);
    assert.match(auditFor(report, 'a1').detail, /only a failed or blocked node can be retried/);
  });

  it('refuses a retry with no node named', () => {
    const report = advance({ requestedActions: [action({ type: 'retry' })] });
    assert.match(auditFor(report, 'a1').detail, /must name a "nodeId"/);
  });

  it('a takeover hands a blocked node to a human', () => {
    const report = advance({
      requestedActions: [
        action({ type: 'reject_decision', decisionId: 'd1' }),
        action({ id: 'a2', type: 'takeover', nodeId: 'design', reason: 'I will redo the design myself.' })
      ]
    });

    assert.deepEqual(report.acceptedActionIds, ['a1', 'a2']);
    const design = report.nodes.find((node) => node.id === 'design');
    assert.match(design?.summary ?? '', /Taken over by human/);
  });

  it('refuses a takeover of a validated node', () => {
    const report = advance({
      requestedActions: [action({ type: 'takeover', nodeId: 'scope' })]
    });

    assert.match(auditFor(report, 'a1').detail, /a validated node is never taken over/);
  });
});

describe('resume across a restart', () => {
  it('never replays a validated node and keeps its validation timestamp', () => {
    const first = advance({
      requestedActions: [action({ type: 'approve_decision', decisionId: 'd1', optionId: 'sql' })]
    });
    assert.deepEqual(first.preservedNodeIds, ['scope']);

    // Feed the report back in, as a different client would after a restart.
    const resumed = advanceProjectRun(
      parseProjectRunSnapshot({
        ...snapshot(),
        status: first.status,
        nodes: first.nodes,
        decisions: first.decisions,
        gates: first.gates,
        history: first.audit,
        requestedActions: []
      }),
      '2026-09-01T09:00:00.000Z'
    );

    assert.deepEqual(resumed.preservedNodeIds, ['scope']);
    assert.equal(
      resumed.nodes.find((node) => node.id === 'scope')?.validatedAt,
      first.nodes.find((node) => node.id === 'scope')?.validatedAt,
      'a validated node must keep its original timestamp across a resume'
    );
    assert.equal(resumed.nextNode?.id, 'design');
    assert.equal(resumed.decisions[0].status, 'approved');
  });

  it('carries the audit history forward and appends to it', () => {
    const history = [
      {
        id: 'past',
        at: '2026-08-30T10:00:00.000Z',
        actionType: 'pause',
        actorId: 'human',
        outcome: 'accepted',
        reason: 'lunch',
        detail: 'Run paused.'
      }
    ];

    const report = advance({
      history,
      requestedActions: [action({ type: 'approve_decision', decisionId: 'd1', optionId: 'sql' })]
    });

    assert.deepEqual(
      report.audit.map((entry) => entry.id),
      ['past', 'a1'],
      'history must come first, then this advance'
    );
  });
});

describe('determinism', () => {
  it('produces byte-identical output for the same input', () => {
    const build = (): string =>
      JSON.stringify(
        advance({
          requestedActions: [
            action({ type: 'approve_decision', decisionId: 'd1', optionId: 'sql' }),
            action({ id: 'a2', type: 'override_gate', gateId: 'g1' })
          ]
        })
      );

    assert.equal(build(), build());
  });

  it('renders markdown that states the transition and the blocker', () => {
    const report = advance();

    assert.match(report.markdown, /# Project Run — Demo/);
    assert.match(report.markdown, /Status: awaiting_decision → awaiting_decision/);
    assert.match(report.markdown, /Blocker: decision/);
    assert.match(report.markdown, /\[preserved\]/);
  });
});
