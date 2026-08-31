import { MCP_HELP, parseServerArgs } from './mcp/cliOptions.ts';
import { runStdioServer } from './mcp/stdio.ts';

/**
 * `ade-mcp` from source — the dev entrypoint (`pnpm mcp`). The published bin is
 * `src/mcp-server.js`, which loads the compiled build instead.
 *
 * Nothing here may write to stdout: it is the JSON-RPC channel. Help and errors
 * go to stderr.
 */
async function main(): Promise<void> {
  const args = parseServerArgs(process.argv.slice(2));

  if (args.usageError) {
    process.stderr.write(`ade-mcp: ${args.usageError}\n\n${MCP_HELP}\n`);
    process.exitCode = 2;
    return;
  }

  if (args.help) {
    process.stderr.write(`${MCP_HELP}\n`);
    return;
  }

  const env = args.projectRoot
    ? { ...process.env, ADE_PROJECT_ROOT: args.projectRoot }
    : process.env;

  await runStdioServer({ allowWrite: args.allowWrite, env });
}

main().catch((error: unknown) => {
  const detail = error instanceof Error ? error.message : 'Unknown error';
  process.stderr.write(`ade-mcp: fatal: ${detail}\n`);
  process.exitCode = 1;
});
