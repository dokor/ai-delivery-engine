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
  implementationHandoff: ImplementationHandoff | null;
  metadata: IssueLifecycleMetadata;
}

/** Bounded, provider-neutral specification promoted from an ADE-admitted issue. */
export interface ImplementationHandoff {
  version: 'ade.implementation-handoff/v1';
  issue: { number: number; url: string; updatedAt: string | null };
  objective: string;
  scope: string[];
  acceptanceCriteria: string[];
  constraints: string[];
  humanDecisionRef: string | null;
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
  if (state === 'completed') return plan('completed', 'none', 'The issue is already completed.', metadata, null, null, options.issue);
  if (state === 'waiting-human') return plan('waiting-human', 'wait', 'A human decision is required before ADE can continue.', metadata, null, null, options.issue);
  if (state === 'blocked' || state === 'failed') return plan('blocked', 'wait', 'The existing ADE work item is blocked and requires an explicit retry or human decision.', metadata, null, null, options.issue);
  if (state === 'running') return plan('developing', 'wait', 'An ADE execution already owns this issue; reconciliation must finish it.', metadata, null, null, options.issue);

  const enrichment = options.configuration?.enrichment;
  const minimum = enrichment?.minimumAcceptanceCriteria ?? 3;
  const adequate = hasAdequateContext(options.issue, minimum);
  if (!adequate && enrichment?.enabled !== false) {
    return plan('enriching', 'enrich', `The issue has fewer than ${minimum} acceptance criteria or no objective.`, metadata, enrichment?.profile ?? 'po-pm', buildIssueEnrichmentPrompt(options.issue), options.issue);
  }
  return plan('ready-for-development', 'develop', adequate ? 'The issue already has ADE development context.' : 'Repository policy permits development without enrichment.', metadata, null, null, options.issue);
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

function plan(stage: IssueLifecycleStage, action: IssueLifecycleAction, reason: string, metadata: IssueLifecycleMetadata, enrichmentProfile: string | null, enrichmentPrompt: string | null, issue?: GitHubIssue): IssueLifecyclePlan {
  return { version: 'ade.issue-lifecycle/v1', stage, action, reason, enrichmentProfile, enrichmentPrompt, implementationHandoff: action === 'develop' && issue ? handoff(issue, metadata) : null, metadata };
}

function handoff(issue: GitHubIssue, metadata: IssueLifecycleMetadata): ImplementationHandoff {
  const section = (name: string): string[] => {
    const match = issue.body.match(new RegExp(`^#{1,3}\\s*(?:${name})\\s*\\n([\\s\\S]*?)(?=^#{1,3}\\s|(?![\\s\\S]))`, 'im'));
    return (match?.[1] ?? '').split(/\r?\n/u).map((value) => value.replace(/^\s*(?:-\s*(?:\[ \]\s*)?)?/u, '').trim()).filter(Boolean).slice(0, 20).map((value) => value.slice(0, 500));
  };
  const objective = section('objective|objectif')[0] ?? issue.title.trim().slice(0, 500);
  const acceptanceCriteria = section('acceptance criteria|crit[eè]res d.acceptation');
  return { version: 'ade.implementation-handoff/v1', issue: { number: issue.number, url: issue.url, updatedAt: issue.updatedAt ?? null }, objective, scope: section('scope|p[eé]rim[eè]tre'), acceptanceCriteria, constraints: section('constraints|contraintes'), humanDecisionRef: metadata.humanDecisionRef };
}
