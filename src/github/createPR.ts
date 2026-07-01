import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import type { PRCreationOptions, GitHubPR, SpecialistReview } from './github.types.ts';

function runGh(args: string): string {
  return execSync('gh ' + args, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
}

export function buildPRBody(options: {
  issueNumber: number;
  issueTitle: string;
  summary: string;
  changedFiles: string[];
  reviews: SpecialistReview[];
}): string {
  const { issueNumber, summary, changedFiles, reviews } = options;

  const filesSection =
    changedFiles.length > 0
      ? changedFiles.map((f) => '- ' + f).join('\n')
      : '*(voir diff)*';

  const reviewSections = reviews
    .map((r) => {
      const findings = r.findings.map((f) => '- ' + f).join('\n');
      const corrections =
        r.correctionsMade.length > 0
          ? '\n\n**Corrections apportees :**\n' +
            r.correctionsMade.map((c) => '- ' + c).join('\n')
          : '';
      return [
        '### ' + r.role + ' Review',
        '',
        r.summary,
        '',
        findings.length > 0 ? '**Points identifies :**\n' + findings : '',
        corrections
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n\n---\n\n');

  return [
    'Closes #' + String(issueNumber),
    '',
    '## Resume',
    '',
    summary,
    '',
    '## Fichiers modifies',
    '',
    filesSection,
    '',
    '---',
    '',
    '## Reviews specialistes',
    '',
    reviewSections,
    '',
    '---',
    '',
    '*Genere par AI Delivery Engine -- review humaine requise avant merge.*'
  ].join('\n');
}

export function createPR(repo: string, options: PRCreationOptions): GitHubPR {
  const base = options.baseBranch ?? 'main';
  const draft = options.draft === true ? '--draft' : '';
  const labels =
    options.labels && options.labels.length > 0
      ? '--label ' + options.labels.join(',')
      : '';

  const tmpPath = '/tmp/ade-pr-body.md';
  writeFileSync(tmpPath, options.body, 'utf-8');

  const safeTitle = options.title.replace(/"/g, "'");
  const cmd =
    'pr create --repo ' + repo +
    ' --title "' + safeTitle + '"' +
    ' --body-file ' + tmpPath +
    ' --base ' + base +
    ' ' + draft +
    ' ' + labels +
    ' --json number,title,url,headRefName,state';

  const output = runGh(cmd);
  const raw: { number: number; title: string; url: string; headRefName: string; state: string } =
    JSON.parse(output);

  return {
    number: raw.number,
    title: raw.title,
    body: options.body,
    url: raw.url,
    headRefName: raw.headRefName,
    state: raw.state as GitHubPR['state']
  };
}
