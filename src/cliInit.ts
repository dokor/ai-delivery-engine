import { access, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { logFailure, logLines } from './cli/logger.ts';
import { defaultConfigJson } from './config/defaultConfig.ts';

/**
 * `ade init` — bootstraps ADE conventions by creating `ade.config.json` with
 * sensible defaults. Idempotent: if the file already exists it is left
 * untouched. `--dry-run` shows what would happen without writing.
 *
 * Usage: ade init [--dry-run]
 */
async function main(): Promise<void> {
  const cwd = process.cwd();
  const dryRun = process.argv.slice(2).includes('--dry-run');
  const configPath = resolve(cwd, 'ade.config.json');

  let exists = false;
  try {
    await access(configPath);
    exists = true;
  } catch {
    exists = false;
  }

  if (exists) {
    logLines(['ADE init', '- ade.config.json already exists; nothing to do.']);
    return;
  }

  if (dryRun) {
    logLines(['ADE init (dry run)', '- would create ade.config.json with default conventions.']);
    return;
  }

  await writeFile(configPath, defaultConfigJson(), 'utf8');
  logLines([
    'ADE init',
    '- created ade.config.json with default conventions.',
    '- next: run `ade config validate` then `ade context generate`.'
  ]);
}

main().catch((error: unknown) => {
  logFailure('Init failed', error);
});
