import { execSync } from 'node:child_process';

function runGh(args: string): string {
  return execSync(`gh ${args}`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
}

export function postIssueComment(repo: string, issueNumber: number, body: string): void {
  const { writeFileSync } = require('node:fs');
  const tmpPath = '/tmp/ade-comment.md';
  writeFileSync(tmpPath, body, 'utf-8');
  runGh(`issue comment ${issueNumber} --repo ${repo} --body-file ${tmpPath}`);
}

export function addIssueLabel(repo: string, issueNumber: number, label: string): void {
  runGh(`issue edit ${issueNumber} --repo ${repo} --add-label "${label}"`);
}

export function removeIssueLabel(repo: string, issueNumber: number, label: string): void {
  runGh(`issue edit ${issueNumber} --repo ${repo} --remove-label "${label}"`);
}

/**
 * Links a PR to its parent issue: posts a comment with the PR link and tags the user.
 */
export function linkPRToIssue(options: {
  repo: string;
  issueNumber: number;
  prNumber: number;
  userHandle: string;
}): void {
  const { repo, issueNumber, prNumber, userHandle } = options;

  const comment = [
    `PR prête pour review : #${prNumber}`,
    '',
    `cc @${userHandle}`,
    '',
    '*AI Delivery Engine — reviews spécialistes incluses dans la PR.*'
  ].join('\n');

  postIssueComment(repo, issueNumber, comment);
  removeIssueLabel(repo, issueNumber, 'in-progress');
  addIssueLabel(repo, issueNumber, 'pr-ready');
}
