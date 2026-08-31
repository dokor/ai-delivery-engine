#!/usr/bin/env node
/**
 * ADE MCP server — plain JavaScript entry point for the `ade-mcp` bin.
 *
 * Loads the compiled build in dist/, like src/cli.js does: Node 22 refuses
 * --experimental-strip-types for files under node_modules/, so a published
 * entrypoint cannot be a .ts file.
 *
 * Unlike src/cli.js, this entry does NOT spawn a child process: the MCP stdio
 * transport owns stdin/stdout, and an extra process would only add latency and
 * a chance to corrupt the stream.
 *
 * For local development, use `pnpm mcp` (runs src/mcpServer.ts from source).
 */

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const distDir = resolve(__dirname, '..', 'dist', 'mcp');

  let cliOptions;
  let stdio;
  try {
    cliOptions = await import(pathToFileURL(resolve(distDir, 'cliOptions.js')).href);
    stdio = await import(pathToFileURL(resolve(distDir, 'stdio.js')).href);
  } catch (error) {
    process.stderr.write(
      'ade-mcp: compiled build not found. Run `pnpm build` (or reinstall the package).\n' +
        `ade-mcp: ${error instanceof Error ? error.message : 'Unknown error'}\n`
    );
    process.exitCode = 1;
    return;
  }

  const args = cliOptions.parseServerArgs(process.argv.slice(2));

  if (args.usageError) {
    process.stderr.write(`ade-mcp: ${args.usageError}\n\n${cliOptions.MCP_HELP}\n`);
    process.exitCode = 2;
    return;
  }

  if (args.help) {
    process.stderr.write(`${cliOptions.MCP_HELP}\n`);
    return;
  }

  const env = args.projectRoot
    ? { ...process.env, ADE_PROJECT_ROOT: args.projectRoot }
    : process.env;

  await stdio.runStdioServer({ allowWrite: args.allowWrite, env });
}

main().catch((error) => {
  const detail = error instanceof Error ? error.message : 'Unknown error';
  process.stderr.write(`ade-mcp: fatal: ${detail}\n`);
  process.exitCode = 1;
});
