/**
 * Argument parsing for the `ade-mcp` entrypoint, shared by the published bin
 * (`src/mcp-server.js`, which loads the compiled build) and the from-source dev
 * entry (`src/mcpServer.ts`). One parser, one behaviour.
 */

export interface ServerArgs {
  allowWrite: boolean;
  /** Project root from `--project-root`; falls back to ADE_PROJECT_ROOT at call time. */
  projectRoot?: string;
  help: boolean;
  usageError?: string;
}

export const MCP_HELP = `ade-mcp — AI Delivery Engine as an MCP server (stdio)

Usage: ade-mcp [options]

Options:
  --project-root <path>  absolute path to the project to serve
                         (also settable via ADE_PROJECT_ROOT)
  --allow-write          let ade_suggest_fix apply fixes; off by default
  --help, -h             show this help

The server speaks newline-delimited JSON-RPC 2.0 on stdin/stdout and is meant to
be launched by an MCP client, not run interactively. It never calls an AI
provider: the client supplies — and pays for — the model.

Configuration examples for Claude and Codex: docs/MCP.md`;

export function parseServerArgs(argv: string[]): ServerArgs {
  const args: ServerArgs = { allowWrite: false, help: false };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case '--allow-write':
        args.allowWrite = true;
        break;
      case '--help':
      case '-h':
        args.help = true;
        break;
      case '--project-root':
        args.projectRoot = argv[i + 1];
        i += 1;
        if (!args.projectRoot) {
          args.usageError = '--project-root requires a path';
        }
        break;
      default:
        args.usageError = `unknown argument "${arg}"`;
    }
  }

  return args;
}
