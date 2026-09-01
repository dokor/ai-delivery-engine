import type { AdeIssueLifecycleConfig } from '../config/config.types.ts';
import { buildIssueEnrichmentPrompt } from './enrichIssue.ts';
import type { GitHubIssue } from './github.types.ts';

export type IssueLifecycleStage = 'preparing' | 'enriching' | 'ready-for-development' | 'developing' | 'reviewing' | 'waiting-human' | 'completed' | 'blocked';
export type IssueLifecycleAction = 'enrich' | 'develop' | 'wait' | 'none';

export interface IssueLifecycleMetadata {
  state: 'ready' | 'running' | 'waiting-human' | 'blocked' | 'completed' | 'failed';
  priority: number;
  dependsOn: number[];
  retryPolicy: 'safe' | 'reconcile-first' | 'never';
  humanDecisionRef: string | null;
  executionRef: string | null;
  branchName: string | null;
  pullRequestNumber: number | null;
}

export interface IssueLifecyclePlan {
  version: 'ade.issue-lifecycle/v1';
  stage: IssueLifecycleStage;
  action: IssueLifecycleAction;
  reason: string;
  enrichmentProfile: string | null;
  enrichmentPrompt: string | null;
  metadata: IssueLifecycleMetadata;
}

export interface PlanIssueLifecycleOptions {
  issue: GitHubIssue;
  metadata?: Partial<IssueLifecycleMetadata> | null;
  configuration?: AdeIssueLifecycleConfig;
}

const DEFAULT_METADATA: IssueLifecycleMetadata = {
  state: 'ready', priority: 50, dependsOn: [], retryPolicy: 'reconcile-first',
  humanDecisionRef: null, executionRef: null, branchName: null, pullRequestNumber: null
};

/**
 * Resolves the next safe lifecycle step from repository policy and an issue.
 * It is pure: GitHub writes and agent execution stay with the caller.
 */
export function planIssueLifecycle(options: PlanIssueLifecycleOptions): IssueLifecyclePlan {
  const metadata = { ...DEFAULT_METADATA, ...options.metadata, ...policyMetadata(options.configuration) };
  const state = metadata.state;
  if (state === 'completed') return plan('completed', 'none', 'The issue is already completed.', metadata, null, null);
  if (state === 'waiting-human') return plan('waiting-human', 'wait', 'A human decision is required before ADE can continue.', metadata, null, null);
  if (state === 'blocked' || state === 'failed') return plan('blocked', 'wait', 'The existing ADE work item is blocked and requires an explicit retry or human decision.', metadata, null, null);
  if (state === 'running') return plan('developing', 'wait', 'An ADE execution already owns this issue; reconciliation must finish it.', metadata, null, null);

  const enrichment = options.configuration?.enrichment;
  const minimum = enrichment?.minimumAcceptanceCriteria ?? 3;
  const adequate = hasAdequateContext(options.issue, minimum);
  if (!adequate && enrichment?.enabled !== false) {
    return plan('enriching', 'enrich', `The issue has fewer than ${minimum} acceptance criteria or no objective.`, metadata, enrichment?.profile ?? 'po-pm', buildIssueEnrichmentPrompt(options.issue));
  }
  return plan('ready-for-development', 'develop', adequate ? 'The issue already has ADE development context.' : 'Repository policy permits development without enrichment.', metadata, null, null);
}

function policyMetadata(configuration: AdeIssueLifecycleConfig | undefined): Partial<IssueLifecycleMetadata> {
  return {
    ...(configuration?.priority !== undefined ? { priority: configuration.priority } : {}),
    ...(configuration?.retryPolicy !== undefined ? { retryPolicy: configuration.retryPolicy } : {})
  };
}

function hasAdequateContext(issue: GitHubIssue, minimum: number): boolean {
  if (issue.labels.includes('ready-for-dev')) return true;
  const objective = /^#{1,3}\s*(objective|objectif)\b/im.test(issue.body);
  const criteria = (issue.body.match(/^\s*- \[ \]/gim) ?? []).length;
  return objective && criteria >= minimum;
}

function plan(stage: IssueLifecycleStage, action: IssueLifecycleAction, reason: string, metadata: IssueLifecycleMetadata, enrichmentProfile: string | null, enrichmentPrompt: string | null): IssueLifecyclePlan {
  return { version: 'ade.issue-lifecycle/v1', stage, action, reason, enrichmentProfile, enrichmentPrompt, metadata };
}
