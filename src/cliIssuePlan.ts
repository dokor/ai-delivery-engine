import { hasConfigErrors, resolveConfig } from './config/loadConfig.ts';
import { planIssueLifecycle } from './github/issueLifecycle.ts';
import type { GitHubIssue } from './github/github.types.ts';

async function main(): Promise<void> {
  if (!process.argv.slice(2).includes('--json')) throw new Error('Usage: ade issue plan --json < input.json');
  const raw = await readStandardInput();
  const input: unknown = JSON.parse(raw);
  if (!isRecord(input) || !isIssue(input.issue)) throw new Error('Input must contain a valid GitHub issue.');
  const resolution = await resolveConfig({ cwd: process.cwd() });
  if (hasConfigErrors(resolution)) throw new Error('ADE configuration is invalid; fix `ade config validate` errors before admitting an issue.');
  process.stdout.write(`${JSON.stringify(planIssueLifecycle({ issue: input.issue, ...(isRecord(input.metadata) ? { metadata: input.metadata } : {}), configuration: resolution.config.issueLifecycle }), null, 2)}\n`);
}

function isIssue(value: unknown): value is GitHubIssue {
  return isRecord(value) && Number.isInteger(value.number) && value.number > 0 && typeof value.title === 'string' && value.title.length > 0 && value.title.length <= 500 && typeof value.body === 'string' && value.body.length <= 32_000 && Array.isArray(value.labels) && value.labels.length <= 50 && value.labels.every((label) => typeof label === 'string' && label.length <= 100) && (value.state === 'open' || value.state === 'closed') && typeof value.url === 'string' && value.url.length <= 2_000 && (value.updatedAt === undefined || typeof value.updatedAt === 'string' && !Number.isNaN(Date.parse(value.updatedAt)));
}

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }

async function readStandardInput(): Promise<string> {
  let raw = '';
  for await (const chunk of process.stdin) raw += String(chunk);
  return raw;
}

void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : 'ADE issue plan failed.'); process.exitCode = 1; });
