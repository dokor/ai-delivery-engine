import { execSync } from 'node:child_process';
import type { GitHubIssue } from './github.types.ts';

function runGh(args: string): string {
  try {
    return execSync(`gh ${args}`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`gh CLI error: ${message}`);
  }
}

export function fetchOpenIssues(repo: string): GitHubIssue[] {
  const raw = runGh(
    `issue list --repo ${repo} --state open --json number,title,body,labels,url --limit 100`
  );
  const parsed: Array<{
    number: number;
    title: string;
    body: string | null;
    labels: Array<{ name: string }>;
    url: string;
  }> = JSON.parse(raw);

  return parsed.map((i) => ({
    number: i.number,
    title: i.title,
    body: i.body ?? '',
    labels: i.labels.map((l) => l.name),
    state: 'open' as const,
    url: i.url
  }));
}

export function fetchIssue(repo: string, number: number): GitHubIssue {
  const raw = runGh(
    `issue view ${number} --repo ${repo} --json number,title,body,labels,url`
  );
  const i: {
    number: number;
    title: string;
    body: string | null;
    labels: Array<{ name: string }>;
    url: string;
  } = JSON.parse(raw);

  return {
    number: i.number,
    title: i.title,
    body: i.body ?? '',
    labels: i.labels.map((l) => l.name),
    state: 'open',
    url: i.url
  };
}

export function filterUnrefinedIssues(issues: GitHubIssue[]): GitHubIssue[] {
  return issues.filter(
    (i) =>
      !i.labels.includes('backlog-refined') &&
      !i.labels.includes('ready-for-dev') &&
      !i.labels.includes('in-progress')
  );
}
