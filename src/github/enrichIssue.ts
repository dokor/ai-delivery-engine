import type { GitHubIssue } from './github.types.ts';

/**
 * Generates a prompt for enriching a GitHub issue using ADE's PO/PM perspective.
 * Paste this into Claude or ChatGPT to get an improved issue body.
 */
export function buildIssueEnrichmentPrompt(issue: GitHubIssue): string {
  const hasBody = issue.body.trim().length > 0;

  return [
    '# Issue Enrichment — PO/PM Role',
    '',
    'You are acting as a PO/PM specialist reviewing a GitHub issue.',
    'Improve the description so it is clear, actionable, and ready for estimation.',
    '',
    '## Original Issue',
    '',
    `**#${issue.number} — ${issue.title}**`,
    '',
    hasBody ? issue.body : '*(no description yet)*',
    '',
    '## Instructions',
    '',
    'Rewrite the issue body with:',
    '',
    '1. **Objective** — one sentence: what needs to be done and why',
    '2. **Acceptance criteria** — at least 3 checkboxes (`- [ ]`)',
    '3. **Technical context** — stack, affected files, constraints (if relevant)',
    '4. **Suggested labels** — pick from: `backend`, `frontend`, `security`, `devops`, `qa`,',
    '   `legal-compliance`, `good-first-issue`, `ready-for-dev`',
    '5. **Sub-issues** — if the work covers more than 3 days, list proposed sub-issues',
    '   with titles and brief descriptions',
    '',
    '## Output format',
    '',
    'Return ONLY the improved issue body in Markdown.',
    'Start with the objective, then acceptance criteria, then context.',
    'Do not include the issue number or title — those stay on GitHub.'
  ].join('\n');
}

/**
 * Estimates the domain of an issue based on its title and body keywords.
 * Returns the most relevant ADE specialist role.
 */
export function estimateIssueRole(
  issue: GitHubIssue
): 'po_pm' | 'security' | 'devops' | 'backend' | 'frontend' | 'qa' | 'legal_compliance' {
  const text = `${issue.title} ${issue.body}`.toLowerCase();

  if (/auth|token|xss|injection|csrf|vuln|secret|exploit|attack/.test(text)) return 'security';
  if (/docker|deploy|ci|cd|pipeline|k8s|kubernetes|nginx|traefik|infra|server/.test(text)) return 'devops';
  if (/rgpd|gdpr|legal|compli|retention|consent|mention/.test(text)) return 'legal_compliance';
  if (/test|qa|coverage|regression|acceptance|e2e/.test(text)) return 'qa';
  if (/api|backend|java|sql|database|endpoint|service|scheduler/.test(text)) return 'backend';
  if (/ui|ux|react|next|front|page|component|css|design|form/.test(text)) return 'frontend';
  return 'po_pm';
}

export function isReadyForDev(issue: GitHubIssue): boolean {
  return issue.labels.includes('ready-for-dev');
}

export function isAlreadyRefined(issue: GitHubIssue): boolean {
  return issue.labels.includes('backlog-refined') || issue.labels.includes('in-progress');
}
