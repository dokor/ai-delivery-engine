import {
  PRESERVED_NODE_STATUSES,
  PROJECT_RUN_SCHEMA_VERSION,
  type ProjectRunActionRequest,
  type ProjectRunActionType,
  type ProjectRunActor,
  type ProjectRunActorKind,
  type ProjectRunAuditEntry,
  type ProjectRunBlocker,
  type ProjectRunDecision,
  type ProjectRunDecisionImpact,
  type ProjectRunDecisionOption,
  type ProjectRunDecisionStatus,
  type ProjectRunGate,
  type ProjectRunGateKind,
  type ProjectRunGateStatus,
  type ProjectRunNode,
  type ProjectRunNodeStatus,
  type ProjectRunPermission,
  type ProjectRunReport,
  type ProjectRunSnapshot,
  type ProjectRunStatus
} from './projectRun.types.ts';

/**
 * Deterministic Project Run transition.
 *
 * `advanceProjectRun` applies the requested actions in order, refuses the ones
 * that lack a permission or describe an impossible transition, recomputes the
 * state of every node, and names the exact cause of a blockage. It launches no
 * agent, touches no repository and bypasses no gate.
 */

// --- Parsing -----------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

function requiredString(value: unknown, field: string): string {
  const stringValue = optionalString(value);
  if (!stringValue) {
    throw new Error(`Invalid project run input: "${field}" is required.`);
  }
  return stringValue;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function optionalBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string' && entry.trim() !== '');
}

function recordArray(value: unknown, field: string): Record<string, unknown>[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new Error(`Invalid project run input: "${field}" must be an array.`);
  }
  return value.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new Error(`Invalid project run input: "${field}[${index}]" must be an object.`);
    }
    return entry;
  });
}

function parseFromSet<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string
): T {
  const stringValue = optionalString(value);
  if (!stringValue || !allowed.includes(stringValue as T)) {
    throw new Error(
      `Invalid project run input: "${field}" must be one of: ${allowed.join(', ')}.`
    );
  }
  return stringValue as T;
}

const RUN_STATUSES: readonly ProjectRunStatus[] = [
  'draft',
  'planning',
  'awaiting_decision',
  'ready',
  'running',
  'paused',
  'blocked',
  'failed',
  'cancelled',
  'completed'
];

const NODE_STATUSES: readonly ProjectRunNodeStatus[] = [
  'pending',
  'ready',
  'running',
  'awaiting_decision',
  'blocked',
  'completed',
  'failed',
  'cancelled',
  'skipped'
];

const GATE_KINDS: readonly ProjectRunGateKind[] = [
  'mvp_scope',
  'architecture',
  'budget',
  'repository_creation',
  'security',
  'production'
];

const GATE_STATUSES: readonly ProjectRunGateStatus[] = [
  'pending',
  'approved',
  'rejected',
  'overridden'
];

const DECISION_STATUSES: readonly ProjectRunDecisionStatus[] = ['pending', 'approved', 'rejected'];

const ACTION_TYPES: readonly ProjectRunActionType[] = [
  'pause',
  'resume',
  'retry',
  'cancel',
  'approve_decision',
  'reject_decision',
  'override_gate',
  'takeover'
];

const ACTOR_KINDS: readonly ProjectRunActorKind[] = ['human', 'agent', 'system'];

const PERMISSIONS: readonly ProjectRunPermission[] = [
  'control_run',
  'decide',
  'override_gate',
  'takeover'
];

function parseImpact(value: unknown): ProjectRunDecisionImpact | undefined {
  if (!isRecord(value)) return undefined;
  const risk = optionalString(value.risk);
  return {
    cost: optionalNumber(value.cost),
    currency: optionalString(value.currency),
    delayDays: optionalNumber(value.delayDays),
    risk: risk === 'low' || risk === 'medium' || risk === 'high' ? risk : undefined,
    note: optionalString(value.note)
  };
}

function parseOption(raw: Record<string, unknown>, field: string): ProjectRunDecisionOption {
  return {
    id: requiredString(raw.id, `${field}.id`),
    label: requiredString(raw.label, `${field}.label`),
    impact: parseImpact(raw.impact)
  };
}

function parseDecision(raw: Record<string, unknown>, index: number): ProjectRunDecision {
  const field = `decisions[${index}]`;
  const options = recordArray(raw.options, `${field}.options`).map((option, optionIndex) =>
    parseOption(option, `${field}.options[${optionIndex}]`)
  );

  if (options.length === 0) {
    throw new Error(`Invalid project run input: "${field}.options" must not be empty.`);
  }

  const decision: ProjectRunDecision = {
    id: requiredString(raw.id, `${field}.id`),
    nodeId: requiredString(raw.nodeId, `${field}.nodeId`),
    question: requiredString(raw.question, `${field}.question`),
    context: optionalString(raw.context),
    options,
    recommendedOptionId: optionalString(raw.recommendedOptionId),
    status: parseFromSet(raw.status, DECISION_STATUSES, `${field}.status`),
    selectedOptionId: optionalString(raw.selectedOptionId),
    answeredBy: optionalString(raw.answeredBy),
    answeredAt: optionalString(raw.answeredAt),
    rationale: optionalString(raw.rationale),
    replanRequired: optionalBoolean(raw.replanRequired)
  };

  if (
    decision.recommendedOptionId &&
    !options.some((option) => option.id === decision.recommendedOptionId)
  ) {
    throw new Error(
      `Invalid project run input: "${field}.recommendedOptionId" does not match any option.`
    );
  }

  return decision;
}

function parseGate(raw: Record<string, unknown>, index: number): ProjectRunGate {
  const field = `gates[${index}]`;
  return {
    id: requiredString(raw.id, `${field}.id`),
    nodeId: requiredString(raw.nodeId, `${field}.nodeId`),
    kind: parseFromSet(raw.kind, GATE_KINDS, `${field}.kind`),
    status: parseFromSet(raw.status, GATE_STATUSES, `${field}.status`),
    description: optionalString(raw.description),
    approvedBy: optionalString(raw.approvedBy),
    approvedAt: optionalString(raw.approvedAt),
    reason: optionalString(raw.reason)
  };
}

function parseNode(raw: Record<string, unknown>, index: number): ProjectRunNode {
  const field = `nodes[${index}]`;
  return {
    id: requiredString(raw.id, `${field}.id`),
    title: requiredString(raw.title, `${field}.title`),
    role: requiredString(raw.role, `${field}.role`),
    status: parseFromSet(raw.status, NODE_STATUSES, `${field}.status`),
    dependsOn: stringArray(raw.dependsOn),
    attemptCount: optionalNumber(raw.attemptCount),
    summary: optionalString(raw.summary),
    blockedReason: optionalString(raw.blockedReason),
    validatedAt: optionalString(raw.validatedAt)
  };
}

function parseActor(raw: Record<string, unknown>, index: number): ProjectRunActor {
  const field = `actors[${index}]`;
  const permissions = stringArray(raw.permissions).filter((permission): permission is ProjectRunPermission =>
    PERMISSIONS.includes(permission as ProjectRunPermission)
  );

  return {
    id: requiredString(raw.id, `${field}.id`),
    kind: parseFromSet(raw.kind, ACTOR_KINDS, `${field}.kind`),
    displayName: optionalString(raw.displayName),
    permissions
  };
}

function parseAction(raw: Record<string, unknown>, index: number): ProjectRunActionRequest {
  const field = `requestedActions[${index}]`;
  return {
    id: requiredString(raw.id, `${field}.id`),
    type: parseFromSet(raw.type, ACTION_TYPES, `${field}.type`),
    actorId: requiredString(raw.actorId, `${field}.actorId`),
    reason: requiredString(raw.reason, `${field}.reason`),
    at: optionalString(raw.at),
    nodeId: optionalString(raw.nodeId),
    decisionId: optionalString(raw.decisionId),
    gateId: optionalString(raw.gateId),
    optionId: optionalString(raw.optionId)
  };
}

function parseAuditEntry(raw: Record<string, unknown>, index: number): ProjectRunAuditEntry {
  const field = `history[${index}]`;
  const outcome = requiredString(raw.outcome, `${field}.outcome`);
  if (outcome !== 'accepted' && outcome !== 'refused') {
    throw new Error(`Invalid project run input: "${field}.outcome" must be accepted or refused.`);
  }

  return {
    id: requiredString(raw.id, `${field}.id`),
    at: requiredString(raw.at, `${field}.at`),
    actionType: parseFromSet(raw.actionType, ACTION_TYPES, `${field}.actionType`),
    actorId: requiredString(raw.actorId, `${field}.actorId`),
    outcome,
    target: optionalString(raw.target),
    reason: requiredString(raw.reason, `${field}.reason`),
    detail: requiredString(raw.detail, `${field}.detail`)
  };
}

function assertUniqueIds(ids: string[], field: string): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) {
      throw new Error(`Invalid project run input: duplicate ${field} id "${id}".`);
    }
    seen.add(id);
  }
}

/** Validates and normalises a raw snapshot, throwing on anything malformed. */
export function parseProjectRunSnapshot(value: unknown): ProjectRunSnapshot {
  if (!isRecord(value)) {
    throw new Error('Invalid project run input: expected a JSON object.');
  }

  if (value.schemaVersion !== PROJECT_RUN_SCHEMA_VERSION) {
    throw new Error(
      `Invalid project run input: "schemaVersion" must be ${PROJECT_RUN_SCHEMA_VERSION}.`
    );
  }

  const nodes = recordArray(value.nodes, 'nodes').map(parseNode);
  if (nodes.length === 0) {
    throw new Error('Invalid project run input: "nodes" must not be empty.');
  }

  const decisions = recordArray(value.decisions, 'decisions').map(parseDecision);
  const gates = recordArray(value.gates, 'gates').map(parseGate);
  const actors = recordArray(value.actors, 'actors').map(parseActor);
  const requestedActions = recordArray(value.requestedActions, 'requestedActions').map(parseAction);
  const history = recordArray(value.history, 'history').map(parseAuditEntry);

  assertUniqueIds(nodes.map((node) => node.id), 'node');
  assertUniqueIds(decisions.map((decision) => decision.id), 'decision');
  assertUniqueIds(gates.map((gate) => gate.id), 'gate');
  assertUniqueIds(actors.map((actor) => actor.id), 'actor');
  assertUniqueIds(requestedActions.map((action) => action.id), 'action');

  const nodeIds = new Set(nodes.map((node) => node.id));
  for (const node of nodes) {
    for (const dependency of node.dependsOn ?? []) {
      if (!nodeIds.has(dependency)) {
        throw new Error(
          `Invalid project run input: node "${node.id}" depends on unknown node "${dependency}".`
        );
      }
    }
  }
  for (const decision of decisions) {
    if (!nodeIds.has(decision.nodeId)) {
      throw new Error(
        `Invalid project run input: decision "${decision.id}" targets unknown node "${decision.nodeId}".`
      );
    }
  }
  for (const gate of gates) {
    if (!nodeIds.has(gate.nodeId)) {
      throw new Error(
        `Invalid project run input: gate "${gate.id}" targets unknown node "${gate.nodeId}".`
      );
    }
  }

  return {
    schemaVersion: PROJECT_RUN_SCHEMA_VERSION,
    runId: requiredString(value.runId, 'runId'),
    projectName: requiredString(value.projectName, 'projectName'),
    status: parseFromSet(value.status, RUN_STATUSES, 'status'),
    generatedAt: optionalString(value.generatedAt),
    nodes,
    decisions,
    gates,
    actors,
    requestedActions,
    history
  };
}

// --- Permissions and transitions ---------------------------------------------

const REQUIRED_PERMISSION: Record<ProjectRunActionType, ProjectRunPermission> = {
  pause: 'control_run',
  resume: 'control_run',
  retry: 'control_run',
  cancel: 'control_run',
  approve_decision: 'decide',
  reject_decision: 'decide',
  override_gate: 'override_gate',
  takeover: 'takeover'
};

/**
 * Statuses beyond which nothing may be applied.
 *
 * `failed` is deliberately absent: a failed run is exactly the case a retry or a
 * takeover exists for. Treating it as terminal would lock a human out of the one
 * state they most need to act on.
 */
const TERMINAL_RUN_STATUSES: readonly ProjectRunStatus[] = ['completed', 'cancelled'];

function isPreserved(node: ProjectRunNode): boolean {
  return PRESERVED_NODE_STATUSES.includes(node.status);
}

// --- Working state -----------------------------------------------------------

interface WorkingState {
  status: ProjectRunStatus;
  nodes: Map<string, ProjectRunNode>;
  decisions: Map<string, ProjectRunDecision>;
  gates: Map<string, ProjectRunGate>;
  actors: Map<string, ProjectRunActor>;
}

function toWorkingState(snapshot: ProjectRunSnapshot): WorkingState {
  return {
    status: snapshot.status,
    nodes: new Map(snapshot.nodes.map((node) => [node.id, { ...node }])),
    decisions: new Map(snapshot.decisions.map((decision) => [decision.id, { ...decision }])),
    gates: new Map(snapshot.gates.map((gate) => [gate.id, { ...gate }])),
    actors: new Map(snapshot.actors.map((actor) => [actor.id, { ...actor }]))
  };
}

interface ActionOutcome {
  accepted: boolean;
  target?: string;
  detail: string;
}

function refuse(detail: string, target?: string): ActionOutcome {
  return { accepted: false, target, detail };
}

function accept(detail: string, target?: string): ActionOutcome {
  return { accepted: true, target, detail };
}

function applyAction(
  state: WorkingState,
  action: ProjectRunActionRequest,
  at: string
): ActionOutcome {
  const actor = state.actors.get(action.actorId);
  if (!actor) {
    return refuse(`Unknown actor "${action.actorId}".`);
  }

  const required = REQUIRED_PERMISSION[action.type];
  if (!actor.permissions.includes(required)) {
    return refuse(
      `Actor "${actor.id}" lacks the "${required}" permission required by "${action.type}".`
    );
  }

  if (TERMINAL_RUN_STATUSES.includes(state.status)) {
    return refuse(`Run is ${state.status}: no action can be applied to a terminal run.`);
  }

  switch (action.type) {
    case 'pause': {
      if (state.status === 'paused') {
        return refuse('Run is already paused.');
      }
      state.status = 'paused';
      return accept('Run paused; no node will be selected until it is resumed.', action.actorId);
    }

    case 'resume': {
      if (state.status !== 'paused') {
        return refuse(`Run is ${state.status}, not paused: nothing to resume.`);
      }
      state.status = 'running';
      return accept('Run resumed; validated nodes are preserved.', action.actorId);
    }

    case 'cancel': {
      state.status = 'cancelled';
      for (const node of state.nodes.values()) {
        if (!isPreserved(node) && node.status !== 'failed') {
          node.status = 'cancelled';
          node.blockedReason = undefined;
        }
      }
      return accept('Run cancelled; validated nodes keep their result.', action.actorId);
    }

    case 'retry': {
      if (!action.nodeId) {
        return refuse('A retry must name a "nodeId".');
      }
      const node = state.nodes.get(action.nodeId);
      if (!node) {
        return refuse(`Unknown node "${action.nodeId}".`, action.nodeId);
      }
      if (node.status !== 'failed' && node.status !== 'blocked') {
        return refuse(
          `Node "${node.id}" is ${node.status}: only a failed or blocked node can be retried.`,
          node.id
        );
      }
      node.status = 'pending';
      node.blockedReason = undefined;
      node.attemptCount = (node.attemptCount ?? 0) + 1;
      return accept(`Node "${node.id}" queued for another attempt.`, node.id);
    }

    case 'takeover': {
      if (!action.nodeId) {
        return refuse('A takeover must name a "nodeId".');
      }
      const node = state.nodes.get(action.nodeId);
      if (!node) {
        return refuse(`Unknown node "${action.nodeId}".`, action.nodeId);
      }
      if (isPreserved(node)) {
        return refuse(
          `Node "${node.id}" is ${node.status}: a validated node is never taken over.`,
          node.id
        );
      }
      node.status = 'pending';
      node.blockedReason = undefined;
      node.summary = `Taken over by ${actor.displayName ?? actor.id}.`;
      return accept(`Node "${node.id}" handed to ${actor.id}.`, node.id);
    }

    case 'approve_decision':
    case 'reject_decision': {
      if (!action.decisionId) {
        return refuse(`A ${action.type} must name a "decisionId".`);
      }
      const decision = state.decisions.get(action.decisionId);
      if (!decision) {
        return refuse(`Unknown decision "${action.decisionId}".`, action.decisionId);
      }
      if (decision.status !== 'pending') {
        return refuse(
          `Decision "${decision.id}" is already ${decision.status}.`,
          decision.id
        );
      }

      if (action.type === 'approve_decision') {
        if (!action.optionId) {
          return refuse('An approval must name the chosen "optionId".', decision.id);
        }
        if (!decision.options.some((option) => option.id === action.optionId)) {
          return refuse(
            `Option "${action.optionId}" is not offered by decision "${decision.id}".`,
            decision.id
          );
        }
        decision.status = 'approved';
        decision.selectedOptionId = action.optionId;
        decision.answeredBy = actor.id;
        decision.answeredAt = at;
        decision.rationale = action.reason;
        return accept(
          `Decision "${decision.id}" approved with option "${action.optionId}" on node "${decision.nodeId}".`,
          decision.id
        );
      }

      decision.status = 'rejected';
      decision.answeredBy = actor.id;
      decision.answeredAt = at;
      decision.rationale = action.reason;
      decision.replanRequired = true;
      return accept(
        `Decision "${decision.id}" rejected on node "${decision.nodeId}"; replanning required.`,
        decision.id
      );
    }

    case 'override_gate': {
      if (!action.gateId) {
        return refuse('An override must name a "gateId".');
      }
      const gate = state.gates.get(action.gateId);
      if (!gate) {
        return refuse(`Unknown gate "${action.gateId}".`, action.gateId);
      }
      if (gate.status === 'approved' || gate.status === 'overridden') {
        return refuse(`Gate "${gate.id}" is already ${gate.status}.`, gate.id);
      }
      gate.status = 'overridden';
      gate.approvedBy = actor.id;
      gate.approvedAt = at;
      gate.reason = action.reason;
      return accept(
        `Gate "${gate.id}" (${gate.kind}) overridden by ${actor.id} on node "${gate.nodeId}".`,
        gate.id
      );
    }

    default: {
      // Exhaustive by construction; kept so an added action type fails loudly.
      const exhaustive: never = action.type;
      return refuse(`Unsupported action "${String(exhaustive)}".`);
    }
  }
}

// --- Recomputation -----------------------------------------------------------

/** Dependency rank, so ready nodes are offered in a stable, meaningful order. */
function computeRanks(nodes: ProjectRunNode[]): Map<string, number> {
  const ranks = new Map<string, number>();
  const byId = new Map(nodes.map((node) => [node.id, node]));

  const rankOf = (id: string, seen: Set<string>): number => {
    const cached = ranks.get(id);
    if (cached !== undefined) return cached;
    if (seen.has(id)) return 0; // Cycle: treat as a root rather than looping forever.

    seen.add(id);
    const node = byId.get(id);
    const dependencies = node?.dependsOn ?? [];
    const rank =
      dependencies.length === 0
        ? 0
        : Math.max(...dependencies.map((dependency) => rankOf(dependency, seen))) + 1;
    seen.delete(id);

    ranks.set(id, rank);
    return rank;
  };

  for (const node of nodes) {
    rankOf(node.id, new Set<string>());
  }
  return ranks;
}

function sortNodes(nodes: ProjectRunNode[], ranks: Map<string, number>): ProjectRunNode[] {
  return [...nodes].sort((left, right) => {
    const rankDelta = (ranks.get(left.id) ?? 0) - (ranks.get(right.id) ?? 0);
    return rankDelta !== 0 ? rankDelta : left.id.localeCompare(right.id);
  });
}

interface Recomputed {
  nodes: ProjectRunNode[];
  status: ProjectRunStatus;
  nextNode?: ProjectRunNode;
  blocker: ProjectRunBlocker;
}

/** What is holding a specific node back, recorded while its status is recomputed. */
type NodeHold =
  | { kind: 'decision'; decisionId: string }
  | { kind: 'gate'; gateId: string }
  | { kind: 'dependency' }
  | { kind: 'failed_node' };

function recompute(state: WorkingState, validatedAt: string): Recomputed {
  const nodes = [...state.nodes.values()];
  const ranks = computeRanks(nodes);
  const byId = new Map(nodes.map((node) => [node.id, node]));

  const decisionsByNode = new Map<string, ProjectRunDecision[]>();
  for (const decision of state.decisions.values()) {
    const list = decisionsByNode.get(decision.nodeId) ?? [];
    list.push(decision);
    decisionsByNode.set(decision.nodeId, list);
  }

  const gatesByNode = new Map<string, ProjectRunGate[]>();
  for (const gate of state.gates.values()) {
    const list = gatesByNode.get(gate.nodeId) ?? [];
    list.push(gate);
    gatesByNode.set(gate.nodeId, list);
  }

  const ordered = sortNodes(nodes, ranks);
  const holds = new Map<string, NodeHold>();

  // Nodes are visited in dependency order so a node sees the recomputed status
  // of everything it depends on.
  for (const node of ordered) {
    if (isPreserved(node)) {
      // A validated node is never recomputed: that is what makes a resume safe.
      node.validatedAt = node.validatedAt ?? validatedAt;
      node.blockedReason = undefined;
      continue;
    }

    if (node.status === 'cancelled' || node.status === 'failed') {
      continue;
    }

    const nodeDecisions = (decisionsByNode.get(node.id) ?? []).sort((left, right) =>
      left.id.localeCompare(right.id)
    );

    // A rejected decision outranks everything else: the node needs replanning
    // whether or not its dependencies are met.
    const rejected = nodeDecisions.find((decision) => decision.status === 'rejected');
    if (rejected) {
      node.status = 'blocked';
      node.blockedReason = `Decision "${rejected.id}" was rejected: the node needs replanning before it can run.`;
      holds.set(node.id, { kind: 'decision', decisionId: rejected.id });
      continue;
    }

    // Dependencies come before the node's own decisions and gates. Reporting a
    // node as gate-blocked while it is three steps away from running would name
    // the wrong cause and make the whole run look gated.
    const dependencies = (node.dependsOn ?? [])
      .map((id) => byId.get(id))
      .filter((dependency): dependency is ProjectRunNode => dependency !== undefined);

    const brokenDependency = dependencies.find(
      (dependency) => dependency.status === 'failed' || dependency.status === 'cancelled'
    );
    if (brokenDependency) {
      node.status = 'blocked';
      node.blockedReason = `Depends on "${brokenDependency.id}", which is ${brokenDependency.status}.`;
      holds.set(node.id, { kind: 'failed_node' });
      continue;
    }

    const unmet = dependencies.filter((dependency) => !isPreserved(dependency));
    if (unmet.length > 0) {
      node.status = 'pending';
      node.blockedReason = `Waiting on ${unmet.map((dependency) => `"${dependency.id}"`).join(', ')}.`;
      holds.set(node.id, { kind: 'dependency' });
      continue;
    }

    // Dependencies are satisfied: now the node's own preconditions decide.
    const pending = nodeDecisions.find((decision) => decision.status === 'pending');
    if (pending) {
      node.status = 'awaiting_decision';
      node.blockedReason = `Waiting on decision "${pending.id}": ${pending.question}`;
      holds.set(node.id, { kind: 'decision', decisionId: pending.id });
      continue;
    }

    const nodeGates = (gatesByNode.get(node.id) ?? []).sort((left, right) =>
      left.id.localeCompare(right.id)
    );
    const closedGate = nodeGates.find(
      (gate) => gate.status !== 'approved' && gate.status !== 'overridden'
    );
    if (closedGate) {
      node.status = 'blocked';
      node.blockedReason = `Gate "${closedGate.id}" (${closedGate.kind}) is ${closedGate.status}.`;
      holds.set(node.id, { kind: 'gate', gateId: closedGate.id });
      continue;
    }

    node.status = node.status === 'running' ? 'running' : 'ready';
    node.blockedReason = undefined;
  }

  const readyNodes = ordered.filter((node) => node.status === 'ready');
  const nextNode = state.status === 'paused' || state.status === 'cancelled' ? undefined : readyNodes[0];

  return {
    nodes: ordered,
    status: deriveRunStatus(state, ordered),
    nextNode,
    blocker: deriveBlocker(state, ordered, nextNode, holds)
  };
}

function deriveRunStatus(state: WorkingState, nodes: ProjectRunNode[]): ProjectRunStatus {
  if (state.status === 'cancelled') return 'cancelled';
  if (nodes.every(isPreserved)) return 'completed';
  if (state.status === 'paused') return 'paused';

  const has = (status: ProjectRunNodeStatus): boolean => nodes.some((node) => node.status === status);

  if (has('running')) return 'running';
  if (has('ready')) return 'ready';
  if (has('awaiting_decision')) return 'awaiting_decision';
  if (has('blocked')) return 'blocked';
  // Nothing ready, nothing waiting on a human: every remaining node failed.
  if (has('failed')) return 'failed';
  return 'blocked';
}

/**
 * Names the one thing standing between the run and its next step.
 *
 * The candidate nodes are examined in dependency order, so the blocker reported
 * is the earliest obstacle — the one worth acting on — rather than whichever
 * unmet gate happens to sit furthest down the graph.
 */
function deriveBlocker(
  state: WorkingState,
  nodes: ProjectRunNode[],
  nextNode: ProjectRunNode | undefined,
  holds: Map<string, NodeHold>
): ProjectRunBlocker {
  if (state.status === 'cancelled') {
    return { kind: 'cancelled', message: 'Run was cancelled.' };
  }
  if (state.status === 'paused') {
    return { kind: 'paused', message: 'Run is paused; resume it to select the next node.' };
  }
  if (nextNode) {
    return { kind: 'none', nodeId: nextNode.id, message: `Next node ready: "${nextNode.id}".` };
  }
  if (nodes.every(isPreserved)) {
    return { kind: 'none', message: 'Every node is validated: the run is complete.' };
  }

  const failedNode = nodes.find((node) => node.status === 'failed');

  for (const node of nodes) {
    const hold = holds.get(node.id);
    if (!hold) continue;

    switch (hold.kind) {
      case 'decision': {
        const decision = state.decisions.get(hold.decisionId);
        return {
          kind: 'decision',
          nodeId: node.id,
          decisionId: hold.decisionId,
          message: decision
            ? `Node "${node.id}" is waiting on decision "${decision.id}" (${decision.status}): ${decision.question}`
            : `Node "${node.id}" is waiting on decision "${hold.decisionId}".`
        };
      }
      case 'gate': {
        const gate = state.gates.get(hold.gateId);
        return {
          kind: 'gate',
          nodeId: node.id,
          gateId: hold.gateId,
          message: gate
            ? `Gate "${gate.id}" (${gate.kind}) on node "${node.id}" is ${gate.status}.`
            : `Node "${node.id}" is waiting on gate "${hold.gateId}".`
        };
      }
      case 'failed_node':
      case 'dependency': {
        // A node held by a dependency is only the real blocker when nothing
        // upstream is itself actionable; the loop order guarantees that here.
        if (failedNode) {
          return {
            kind: 'failed_node',
            nodeId: failedNode.id,
            message: `Node "${failedNode.id}" failed: retry it or replan.`
          };
        }
        return {
          kind: 'dependency',
          nodeId: node.id,
          message: node.blockedReason ?? `Node "${node.id}" cannot start yet.`
        };
      }
    }
  }

  if (failedNode) {
    return {
      kind: 'failed_node',
      nodeId: failedNode.id,
      message: `Node "${failedNode.id}" failed: retry it or replan.`
    };
  }

  return { kind: 'none', message: 'No blocker.' };
}

// --- Rendering ---------------------------------------------------------------

function renderMarkdown(report: Omit<ProjectRunReport, 'markdown'>): string {
  const lines: string[] = [
    `# Project Run — ${report.projectName}`,
    '',
    `- Run: ${report.runId}`,
    `- Status: ${report.previousStatus} → ${report.status}`,
    `- Generated at: ${report.generatedAt}`,
    ...(report.snapshotGeneratedAt ? [`- Snapshot taken at: ${report.snapshotGeneratedAt}`] : []),
    `- Blocker: ${report.blocker.kind} — ${report.blocker.message}`,
    `- Resumable: ${report.resumable ? 'yes' : 'no'}`,
    `- Replan required: ${report.replanRequired ? 'yes' : 'no'}`,
    ''
  ];

  lines.push('## Next step', '');
  lines.push(
    report.nextNode
      ? `- ${report.nextNode.id} — ${report.nextNode.title} (${report.nextNode.role})`
      : '- none: see the blocker above.'
  );
  lines.push('');

  lines.push('## Nodes', '');
  for (const node of report.nodes) {
    const preserved = report.preservedNodeIds.includes(node.id) ? ' [preserved]' : '';
    lines.push(`- \`${node.status}\` ${node.id} — ${node.title} (${node.role})${preserved}`);
    if (node.blockedReason) {
      lines.push(`  - ${node.blockedReason}`);
    }
  }
  lines.push('');

  if (report.decisions.length > 0) {
    lines.push('## Decisions', '');
    for (const decision of report.decisions) {
      const answer = decision.selectedOptionId ? ` → ${decision.selectedOptionId}` : '';
      lines.push(`- \`${decision.status}\` ${decision.id} on ${decision.nodeId}${answer}`);
      lines.push(`  - ${decision.question}`);
      if (decision.rationale) {
        lines.push(`  - rationale: ${decision.rationale}`);
      }
    }
    lines.push('');
  }

  if (report.gates.length > 0) {
    lines.push('## Gates', '');
    for (const gate of report.gates) {
      lines.push(`- \`${gate.status}\` ${gate.id} (${gate.kind}) on ${gate.nodeId}`);
      if (gate.status === 'overridden') {
        lines.push(`  - overridden by ${gate.approvedBy ?? 'unknown'}: ${gate.reason ?? 'no reason given'}`);
      }
    }
    lines.push('');
  }

  lines.push('## Audit', '');
  if (report.audit.length === 0) {
    lines.push('- no action recorded.');
  } else {
    for (const entry of report.audit) {
      lines.push(
        `- \`${entry.outcome}\` ${entry.actionType} by ${entry.actorId}${entry.target ? ` on ${entry.target}` : ''}`
      );
      lines.push(`  - requested because: ${entry.reason}`);
      lines.push(`  - ${entry.detail}`);
    }
  }
  lines.push('');

  return `${lines.join('\n')}`;
}

// --- Entry point -------------------------------------------------------------

/**
 * Applies the snapshot's requested actions and returns the resulting run state.
 *
 * `generatedAt` is injectable so the same snapshot yields byte-identical output
 * on every run — the property the demo workflow and the tests rely on.
 */
export function advanceProjectRun(
  snapshot: ProjectRunSnapshot,
  generatedAt = new Date().toISOString()
): ProjectRunReport {
  const state = toWorkingState(snapshot);
  const previousStatus = snapshot.status;

  const audit: ProjectRunAuditEntry[] = [...(snapshot.history ?? [])];
  const acceptedActionIds: string[] = [];
  const refusedActionIds: string[] = [];

  for (const action of snapshot.requestedActions) {
    const at = action.at ?? generatedAt;
    const outcome = applyAction(state, action, at);

    audit.push({
      id: action.id,
      at,
      actionType: action.type,
      actorId: action.actorId,
      outcome: outcome.accepted ? 'accepted' : 'refused',
      target: outcome.target,
      reason: action.reason,
      detail: outcome.detail
    });

    if (outcome.accepted) {
      acceptedActionIds.push(action.id);
    } else {
      refusedActionIds.push(action.id);
    }
  }

  const recomputed = recompute(state, generatedAt);

  const decisions = [...state.decisions.values()].sort((left, right) =>
    left.id.localeCompare(right.id)
  );
  const gates = [...state.gates.values()].sort((left, right) => left.id.localeCompare(right.id));
  const preservedNodeIds = recomputed.nodes.filter(isPreserved).map((node) => node.id);
  const pendingDecisionIds = decisions
    .filter((decision) => decision.status === 'pending')
    .map((decision) => decision.id);

  const summaryLines = [
    `Run ${snapshot.runId}: ${previousStatus} → ${recomputed.status}`,
    `Next node: ${recomputed.nextNode ? recomputed.nextNode.id : 'none'}`,
    `Blocker: ${recomputed.blocker.kind} — ${recomputed.blocker.message}`,
    `Actions: ${acceptedActionIds.length} accepted, ${refusedActionIds.length} refused`,
    `Preserved nodes: ${preservedNodeIds.length > 0 ? preservedNodeIds.join(', ') : 'none'}`
  ];

  const withoutMarkdown: Omit<ProjectRunReport, 'markdown'> = {
    schemaVersion: PROJECT_RUN_SCHEMA_VERSION,
    generatedAt,
    snapshotGeneratedAt: snapshot.generatedAt,
    runId: snapshot.runId,
    projectName: snapshot.projectName,
    previousStatus,
    status: recomputed.status,
    nodes: recomputed.nodes,
    decisions,
    gates,
    audit,
    acceptedActionIds,
    refusedActionIds,
    nextNode: recomputed.nextNode,
    blocker: recomputed.blocker,
    preservedNodeIds,
    resumable: recomputed.nextNode !== undefined,
    replanRequired: decisions.some((decision) => decision.replanRequired === true),
    pendingDecisionIds,
    summaryLines
  };

  return { ...withoutMarkdown, markdown: renderMarkdown(withoutMarkdown) };
}
