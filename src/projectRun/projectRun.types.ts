/**
 * Project Run contract — ADE's durable hold on the state of a delivery.
 *
 * A Project Run persists the plan, the artifacts, the human decisions, the
 * agents involved and the next step to execute. It is the write side of a run:
 * `src/observability/` renders what happened, this domain decides what may
 * happen next and refuses what may not.
 *
 * Two properties matter more than features here. First, **transitions are
 * deterministic**: the same snapshot plus the same requested actions always
 * produce the same report, which is what makes a run auditable and resumable
 * across a restart or a change of AI client. Second, **refusals are recorded**:
 * an action denied for lack of permission or as an invalid transition leaves an
 * audit entry, because a silent refusal is indistinguishable from a bug.
 *
 * This slice never launches an agent, never touches Git and never bypasses a
 * human gate.
 */

export const PROJECT_RUN_SCHEMA_VERSION = 1 as const;

export type ProjectRunSchemaVersion = typeof PROJECT_RUN_SCHEMA_VERSION;

/** Lifecycle of the run as a whole. */
export type ProjectRunStatus =
  | 'draft'
  | 'planning'
  | 'awaiting_decision'
  | 'ready'
  | 'running'
  | 'paused'
  | 'blocked'
  | 'failed'
  | 'cancelled'
  | 'completed';

/** Lifecycle of a single node of the delivery graph. */
export type ProjectRunNodeStatus =
  | 'pending'
  | 'ready'
  | 'running'
  | 'awaiting_decision'
  | 'blocked'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'skipped';

/**
 * Node statuses that must never be replayed on resume. A completed or skipped
 * node keeps its result across restarts — replaying it would waste budget and,
 * worse, could produce a different outcome than the one a human already
 * approved.
 */
export const PRESERVED_NODE_STATUSES: readonly ProjectRunNodeStatus[] = ['completed', 'skipped'];

/** Targeted gates: the few places where a human decision is genuinely required. */
export type ProjectRunGateKind =
  | 'mvp_scope'
  | 'architecture'
  | 'budget'
  | 'repository_creation'
  | 'security'
  | 'production';

export type ProjectRunGateStatus = 'pending' | 'approved' | 'rejected' | 'overridden';

export type ProjectRunDecisionStatus = 'pending' | 'approved' | 'rejected';

/** Actions a caller may request against a run. */
export type ProjectRunActionType =
  | 'pause'
  | 'resume'
  | 'retry'
  | 'cancel'
  | 'approve_decision'
  | 'reject_decision'
  | 'override_gate'
  | 'takeover';

/**
 * Permissions are coarse on purpose: fine-grained rights would suggest an
 * authorisation system ADE does not have. `decide` answers a decision,
 * `override_gate` bypasses a gate — deliberately separate, since overriding is
 * the one action that removes a human checkpoint rather than satisfying it.
 */
export type ProjectRunPermission = 'control_run' | 'decide' | 'override_gate' | 'takeover';

export type ProjectRunActorKind = 'human' | 'agent' | 'system';

export type ProjectRunActor = {
  id: string;
  kind: ProjectRunActorKind;
  displayName?: string;
  permissions: ProjectRunPermission[];
};

/** Expected consequences of an option, so a human arbitrates on facts. */
export type ProjectRunDecisionImpact = {
  cost?: number;
  currency?: string;
  delayDays?: number;
  risk?: 'low' | 'medium' | 'high';
  note?: string;
};

export type ProjectRunDecisionOption = {
  id: string;
  label: string;
  impact?: ProjectRunDecisionImpact;
};

/**
 * A decision is always attached to a node. A run-wide question would make the
 * arbitration too global to act on: the point is to know exactly which step is
 * waiting, and on what.
 */
export type ProjectRunDecision = {
  id: string;
  nodeId: string;
  question: string;
  context?: string;
  options: ProjectRunDecisionOption[];
  /** ADE's recommendation. Advisory only — never applied automatically. */
  recommendedOptionId?: string;
  status: ProjectRunDecisionStatus;
  selectedOptionId?: string;
  answeredBy?: string;
  answeredAt?: string;
  rationale?: string;
  /** Set when a rejection leaves the node with no viable path. */
  replanRequired?: boolean;
};

export type ProjectRunGate = {
  id: string;
  nodeId: string;
  kind: ProjectRunGateKind;
  status: ProjectRunGateStatus;
  description?: string;
  approvedBy?: string;
  approvedAt?: string;
  /** Justification, required when a gate is overridden. */
  reason?: string;
};

export type ProjectRunNode = {
  id: string;
  title: string;
  role: string;
  status: ProjectRunNodeStatus;
  dependsOn?: string[];
  attemptCount?: number;
  summary?: string;
  /** Why this node cannot progress. Recomputed on every advance. */
  blockedReason?: string;
  /** Set once the node reached a preserved status; survives a resume. */
  validatedAt?: string;
};

/**
 * An action as requested by a caller. `advanceProjectRun` decides whether it is
 * accepted; the caller never states the outcome.
 */
export type ProjectRunActionRequest = {
  id: string;
  type: ProjectRunActionType;
  actorId: string;
  reason: string;
  at?: string;
  nodeId?: string;
  decisionId?: string;
  gateId?: string;
  /** Option chosen when approving a decision. */
  optionId?: string;
};

/** Durable snapshot of a run, as read from disk or from another client. */
export type ProjectRunSnapshot = {
  schemaVersion: ProjectRunSchemaVersion;
  runId: string;
  projectName: string;
  status: ProjectRunStatus;
  generatedAt?: string;
  nodes: ProjectRunNode[];
  decisions: ProjectRunDecision[];
  gates: ProjectRunGate[];
  actors: ProjectRunActor[];
  /** Actions to apply during this advance, in order. */
  requestedActions: ProjectRunActionRequest[];
  /** Audit carried over from previous advances, so history survives a restart. */
  history?: ProjectRunAuditEntry[];
};

export type ProjectRunAuditOutcome = 'accepted' | 'refused';

export type ProjectRunAuditEntry = {
  id: string;
  at: string;
  actionType: ProjectRunActionType;
  actorId: string;
  outcome: ProjectRunAuditOutcome;
  /** What the action acted on: a node, a decision or a gate. */
  target?: string;
  reason: string;
  /** Why an action was refused, or what changed when it was accepted. */
  detail: string;
};

/** Why the run cannot move forward, named precisely enough to act on. */
export type ProjectRunBlocker = {
  kind: 'decision' | 'gate' | 'failed_node' | 'dependency' | 'paused' | 'cancelled' | 'none';
  nodeId?: string;
  decisionId?: string;
  gateId?: string;
  message: string;
};

export type ProjectRunReport = {
  schemaVersion: ProjectRunSchemaVersion;
  generatedAt: string;
  /** When the input snapshot was taken, when it says so. Useful to spot a stale resume. */
  snapshotGeneratedAt?: string;
  runId: string;
  projectName: string;
  /** Status before the requested actions were applied. */
  previousStatus: ProjectRunStatus;
  status: ProjectRunStatus;
  nodes: ProjectRunNode[];
  decisions: ProjectRunDecision[];
  gates: ProjectRunGate[];
  /** Every action of this advance, accepted or refused, plus carried history. */
  audit: ProjectRunAuditEntry[];
  acceptedActionIds: string[];
  refusedActionIds: string[];
  /** The next node that may execute, when one exists. */
  nextNode?: ProjectRunNode;
  blocker: ProjectRunBlocker;
  /** Nodes that must not be replayed on resume. */
  preservedNodeIds: string[];
  /** True when the run can continue without further human input. */
  resumable: boolean;
  /** True when a rejected decision left a node with no viable path. */
  replanRequired: boolean;
  /** Decisions still waiting on a human, in deterministic order. */
  pendingDecisionIds: string[];
  summaryLines: string[];
  markdown: string;
};

export type ProjectRunWrittenFiles = {
  jsonPath: string;
  markdownPath: string;
};

/**
 * Node-level result emitted by an execution loop (`src/executionLoop/`). The
 * shape mirrors `ExecutionLoopProjectRunUpdate` so a finished loop can be folded
 * into a run without a translation layer.
 */
export type ProjectRunNodeUpdate = {
  runId: string;
  nodeId: string;
  status: 'completed' | 'blocked' | 'failed' | 'cancelled';
  summary: string;
  attemptCount: number;
  nextAction: string;
};
