# ADE as an MCP server

`ade-mcp` exposes AI Delivery Engine to any MCP client over stdio: Claude Code,
Claude Desktop, Codex CLI, Cursor, or your own.

## What this is, and what it is not

MCP adds no intelligence to ADE. It lets an AI client you already chose reach
ADE's context and rules through a standard protocol.

- **ADE provides the facts**: resolved configuration, project context, rule
  definitions, deterministic reviews, setup diagnostics, mechanical fixes.
- **Your client provides the reasoning** — and pays for it. The server never
  calls an AI provider, needs no API key, and opens no network connection.

Every tool result is produced by the same code as the corresponding `ade`
command, so the CLI, the CI and your agent agree by construction.

## Install

The server ships with the package and needs no extra dependency — ADE has no
runtime dependencies at all.

```bash
npm install -g @alelouet/ai-delivery-engine
ade-mcp --help
```

From a clone of this repository, run it from source instead:

```bash
pnpm build      # required once, for the published bin
pnpm mcp        # runs src/mcpServer.ts directly
```

`ade-mcp` speaks newline-delimited JSON-RPC on stdin/stdout. It is meant to be
launched by a client, not used interactively.

## Choosing the project

Tools act on an absolute project root, resolved in this order:

1. the `projectRoot` argument of the tool call;
2. the `ADE_PROJECT_ROOT` environment variable (also set by `--project-root`).

The working directory is **never** used as a fallback. A server launched by a
client inherits an arbitrary working directory, and silently analysing the wrong
tree would be worse than refusing.

## Configuration

### Claude Code

Either run:

```bash
claude mcp add ade --env ADE_PROJECT_ROOT=/absolute/path/to/project -- ade-mcp
```

or commit a `.mcp.json` at the root of the project, so the whole team gets it:

```json
{
  "mcpServers": {
    "ade": {
      "command": "ade-mcp",
      "args": [],
      "env": { "ADE_PROJECT_ROOT": "/absolute/path/to/project" }
    }
  }
}
```

### Claude Desktop

In `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ade": {
      "command": "ade-mcp",
      "args": ["--project-root", "/absolute/path/to/project"]
    }
  }
}
```

### Codex CLI

In `~/.codex/config.toml`:

```toml
[mcp_servers.ade]
command = "ade-mcp"
args = ["--project-root", "/absolute/path/to/project"]
```

Codex does not send MCP `roots` and ignores tool annotations, which is why the
project root is passed explicitly and why every safety bound is enforced
server-side rather than advertised to the client.

### Windows

Global npm bins are `.cmd` shims, which most MCP clients cannot execute
directly. Wrap them:

```json
{
  "mcpServers": {
    "ade": {
      "command": "cmd",
      "args": ["/c", "ade-mcp", "--project-root", "C:\\Users\\you\\projects\\demo"]
    }
  }
}
```

Or point at Node and the installed entrypoint, avoiding the shim entirely:

```json
{
  "command": "node",
  "args": [
    "C:\\path\\to\\node_modules\\@alelouet\\ai-delivery-engine\\src\\mcp-server.js",
    "--project-root",
    "C:\\Users\\you\\projects\\demo"
  ]
}
```

## Tools

All are read-only unless stated otherwise.

| Tool | What it does | Equivalent command |
|---|---|---|
| `ade_get_project_context` | Detected stack, packages, commands, conventions, ADRs. `format`: `markdown` (default) or `json`. | `ade context generate` |
| `ade_list_rules` | Active rules for the project, or every built-in pack (`scope: "available"`, no project root needed). | `ade rules list` / `available` |
| `ade_explain_rule` | One rule by `ruleId`: what, why, how to fix, and whether it is active here. | — |
| `ade_review_files` | Deterministic review of the project, optionally narrowed by `files`. | `ade review` |
| `ade_review_git_diff` | Same review scoped to a diff: `staged: true` or `base: "<ref>"`. | `ade review --staged` / `--base` |
| `ade_doctor` | Node version, configuration validity, configured tools, context freshness. | `ade doctor` |
| `ade_suggest_fix` | Lists mechanical fixes. **Plans only by default**; `apply: true` requires a write-enabled server. | `ade fix --dry-run` |
| `ade_project_setup` | `mode: "contract"` returns the versioned catalogue of what a repository needs to be ADE-ready; `mode: "check"` (default) evaluates one repository as ready, incomplete or invalid. | `ade setup contract` / `ade setup check` |

`ade_review_git_diff` runs `git diff --name-only` and nothing else. When no diff
can be determined — not a git repository, git unavailable — the result says so
instead of pretending the scope was applied.

## Safety bounds

A tool argument comes from a language model, which may have read a path out of a
file, an issue or a code comment. Everything crossing the boundary is treated as
untrusted:

- **Confinement.** Every path is resolved and refused if it lands outside the
  project root, symlinks included — the real path is checked, not just the
  resolved string.
- **Read-only by default.** No tool writes anything unless the server was
  started with `--allow-write`, and `ade_suggest_fix` is the only tool that can
  ever write. Each applied change is logged to stderr before it happens.
- **No truncation.** An over-long result is refused with an explicit message
  naming the limit. A silently shortened review reads as a complete one to a
  model, which is a correctness problem, not a formatting one.
- **Caps.** 200 files per call, 512 KB per result, 30 s per call. Exceeding one
  is an error, never a partial answer.
- **Exclusions.** Ignored files and the `sensitive` globs of the configuration
  (`.env*`, `*.pem`, `*.key`, `secrets.*` by default) stay out of every result.
- **No GitHub writes.** ADE's GitHub helpers — opening pull requests, posting
  comments, editing issues — are deliberately not exposed.

Enabling writes:

```bash
ade-mcp --project-root /path/to/project --allow-write
```

## Cost

The server is free to run and needs no key. Any cost belongs to the client
that drives it: your Claude or Codex subscription, or your own provider. ADE
never adds a call of its own.

## Troubleshooting

**"No project root."** The tool call had no `projectRoot` and the server was
started without `--project-root` or `ADE_PROJECT_ROOT`. This is deliberate — see
*Choosing the project*.

**The client shows no tools.** Check the server's stderr in your client's MCP
logs. If it says the compiled build is missing, run `pnpm build`.

**Nothing happens at all.** Something on stdout that is not JSON-RPC will break
the session silently. If you patched ADE, make sure no `console.log` reached
stdout: diagnostics belong on stderr.

## Protocol

JSON-RPC 2.0 over newline-delimited stdio. Supported protocol versions:
`2025-06-18` (default), `2025-03-26`, `2024-11-05` — the server echoes the
client's version when it recognises it. Implemented methods: `initialize`,
`ping`, `tools/list`, `tools/call`.

The transport is implemented directly rather than through the MCP SDK, to keep
ADE free of runtime dependencies. It is confined to `src/mcp/stdio.ts` and
`src/mcp/server.ts`, so switching to the SDK later would touch those two files
and no tool code.

## Programmatic API

The same core is importable, which is what guarantees CLI/MCP parity:

```js
import { runProjectReview, runDoctor, collectProjectContext } from '@alelouet/ai-delivery-engine';

const outcome = await runProjectReview({ projectRoot: '/absolute/path' });
console.log(outcome.result.summary);
```

Every exported function takes an explicit project root, returns data and throws
on failure. None of them reads `process.argv`, writes to a stream or sets an
exit code.
