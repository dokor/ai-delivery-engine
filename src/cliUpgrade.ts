import { logFailure, logLines } from './cli/logger.ts';
import { getAdeVersion } from './cli/packageInfo.ts';

const PACKAGE_NAME = '@alelouet/ai-delivery-engine';

/**
 * `ade upgrade` — reports the installed ADE version and how to upgrade. Makes no
 * network calls by default (local-first): it prints the command to run rather
 * than fetching or installing anything.
 *
 * Usage: ade upgrade
 */
async function main(): Promise<void> {
  logLines([
    'ADE upgrade',
    `- Installed version: ${getAdeVersion()}`,
    '- ADE does not perform network calls automatically.',
    `- To upgrade globally: npm install -g ${PACKAGE_NAME}@latest`,
    `- To upgrade in a project: npm install -D ${PACKAGE_NAME}@latest`
  ]);
}

main().catch((error: unknown) => {
  logFailure('Upgrade failed', error);
});
