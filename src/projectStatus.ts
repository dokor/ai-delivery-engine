import { logFailure, logLines } from './cli/logger.ts';
import { resolveOutputDirectory } from './cli/paths.ts';
import {
  collectProjectStatus,
  renderProjectStatus,
  writeProjectStatus
} from './status/projectStatus.ts';

const DEFAULT_OUTPUT_DIRECTORY = 'outputs';

async function main(): Promise<void> {
  const [outputArg] = process.argv.slice(2);
  const outputsDirectory = resolveOutputDirectory(outputArg, DEFAULT_OUTPUT_DIRECTORY);
  const status = await collectProjectStatus(outputsDirectory);
  const statusPath = await writeProjectStatus(status, outputsDirectory);

  logLines([...renderProjectStatus(status), `- JSON status output: ${statusPath}`]);
}

main().catch((error: unknown) => {
  logFailure('Project status failed', error);
});
