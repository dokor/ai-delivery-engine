import { logFailure, logLines } from './cli/logger.ts';
import { getProjectSetupContract, getSetupTemplate, projectSetupContractToJson } from './setup/requirements.ts';

/**
 * `ade setup contract` — prints the versioned ADE project setup contract: what
 * a repository needs to be fully configured for ADE, independently of any
 * repository.
 *
 * `--json` emits the stable machine-readable shape consumed by
 * `ade-control-plane`; it is the default when no template is requested.
 * `--template <id>` prints the ADE-owned content that satisfies one requirement,
 * so a consumer applies ADE's defaults instead of copying its own.
 *
 * Usage: ade setup contract [--json] [--template <id>]
 * Exit:  0 ok · 2 unknown template id
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const templateIndex = args.indexOf('--template');

  if (templateIndex !== -1) {
    const templateId = args[templateIndex + 1];
    if (!templateId) {
      logFailure('Setup contract usage error', new Error('--template requires a template id'));
      process.exitCode = 2;
      return;
    }

    const body = getSetupTemplate(templateId);
    if (body === undefined) {
      const known = getProjectSetupContract()
        .requirements.map((requirement) => requirement.template?.id)
        .filter((id): id is string => Boolean(id));
      logFailure(
        'Setup contract usage error',
        new Error(`unknown template "${templateId}". Known templates: ${known.join(', ')}`)
      );
      process.exitCode = 2;
      return;
    }

    process.stdout.write(body);
    return;
  }

  const contract = getProjectSetupContract();

  if (args.includes('--human')) {
    logLines([
      `ADE project setup contract (${contract.version}, ADE ${contract.adeVersion})`,
      `- Requirements: ${contract.requirements.length}`,
      `- Required: ${contract.requirements.filter((r) => r.criticality === 'required').length}`,
      `- Recommended: ${contract.requirements.filter((r) => r.criticality === 'recommended').length}`,
      `- Optional: ${contract.requirements.filter((r) => r.criticality === 'optional').length}`,
      `- Available rule packs: ${contract.availableRulePacks.map((pack) => pack.id).join(', ')}`,
      `- Workflow labels: ${contract.githubLabels.length}`,
      `- Issue templates: ${contract.issueTemplates.length}`
    ]);
    return;
  }

  process.stdout.write(projectSetupContractToJson(contract));
}

main().catch((error: unknown) => {
  logFailure('Setup contract failed', error);
});
