import { hasConfigErrors, resolveConfig } from './config/loadConfig.ts';
import { planDelivery, type DeliveryPlanNegotiation } from './github/deliveryPlan.ts';
import type { GitHubIssue } from './github/github.types.ts';
import type { IssueLifecycleMetadata } from './github/issueLifecycle.ts';

async function main(): Promise<void> {
  if (!process.argv.slice(2).includes('--json')) throw new Error('Usage: ade delivery plan --json < input.json');
  const input: unknown = JSON.parse(await readStandardInput());
  if (!isRecord(input) || !isIssue(input.issue)) throw new Error('Input must contain a valid GitHub issue.');
  const resolution = await resolveConfig({ cwd: process.cwd() });
  if (hasConfigErrors(resolution)) throw new Error('ADE configuration is invalid; fix `ade config validate` errors before requesting a delivery plan.');
  const result = planDelivery({
    issue: input.issue,
    ...(isRecord(input.metadata) ? { metadata: input.metadata as Partial<IssueLifecycleMetadata> } : {}),
    ...(isRecord(input.negotiation) ? { negotiation: input.negotiation as DeliveryPlanNegotiation } : {}),
    configuration: resolution.config,
    provenance: { configSources: resolution.sources, configKeys: resolution.provenance.map((entry) => entry.key) }
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

function isIssue(value: unknown): value is GitHubIssue {
  return isRecord(value) && Number.isInteger(value.number) && typeof value.title === 'string' && typeof value.body === 'string' && Array.isArray(value.labels) && value.labels.every((label) => typeof label === 'string') && (value.state === 'open' || value.state === 'closed') && typeof value.url === 'string';
}
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
async function readStandardInput(): Promise<string> { let raw = ''; for await (const chunk of process.stdin) raw += String(chunk); return raw; }

void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : 'ADE delivery plan failed.'); process.exitCode = 1; });
