import type { Finding, ReviewResult } from './findings.types.ts';

const SEVERITY_LABEL: Record<Finding['severity'], string> = {
  error: 'ERROR',
  warn: 'WARN',
  info: 'INFO'
};

function renderFinding(finding: Finding): string {
  const location = finding.file
    ? ` ${finding.file}${finding.location?.line ? `:${finding.location.line}` : ''}`
    : '';
  const suggestion = finding.suggestion ? ` — ${finding.suggestion}` : '';
  return `  [${SEVERITY_LABEL[finding.severity]}] ${finding.rule} (${finding.origin})${location}: ${finding.message}${suggestion}`;
}

/** Human-readable review report for the terminal. */
export function renderReviewHuman(result: ReviewResult): string[] {
  const lines: string[] = ['ADE review'];

  const scopeLabel =
    result.scope.kind === 'project'
      ? 'whole project'
      : result.scope.kind === 'staged'
        ? 'staged changes'
        : `base ${result.scope.base ?? 'main'}`;
  lines.push(`- Scope: ${scopeLabel}`);
  if (result.scope.changedFiles) {
    lines.push(`- Changed files: ${result.scope.changedFiles.length}`);
  }

  if (result.findings.length === 0) {
    lines.push('- No findings.');
  } else {
    lines.push(`- Findings: ${result.summary.total} (${result.summary.error} error, ${result.summary.warn} warn, ${result.summary.info} info)`);
    for (const finding of result.findings) {
      lines.push(renderFinding(finding));
    }
  }

  return lines;
}

export function reviewToJson(result: ReviewResult): string {
  return `${JSON.stringify(result, null, 2)}\n`;
}
