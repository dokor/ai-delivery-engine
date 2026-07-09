# ADE CLI

`ade` is the stable command-line surface for AI Delivery Engine — a common
entry point for humans, CI, hooks, IDEs and (later) AI agents. It provides the
local project **runtime** (context, rules, workflows, prompts, tools, result
formats). ADE stays useful without any AI provider; a provider can be plugged in
explicitly, but is never called implicitly.

## Installation

```bash
# one-off
npx @alelouet/ai-delivery-engine --help

# per project (recommended)
npm install -D @alelouet/ai-delivery-engine
npx ade --help

# global
npm install -g @alelouet/ai-delivery-engine
ade --help
```

Requires Node.js >= 22. During local development of this repo, the same
commands are available as `pnpm` scripts (e.g. `pnpm review`, `pnpm doctor`).

## Command syntax

Canonical form is `ade <group> <action>`; top-level commands have no group.
Legacy colon forms (`ade config:print`) remain supported.

## Commands

### Setup & diagnostics

| Command | Description |
|---|---|
| `ade init [--dry-run]` | Create `ade.config.json` with default conventions (idempotent). |
| `ade doctor` | Diagnose Node version, config validity, configured tools, context freshness. |
| `ade upgrade` | Print the installed version and how to upgrade (no network calls). |

### Configuration

| Command | Description |
|---|---|
| `ade config validate [path]` | Resolve and validate the configuration; no writes. |
| `ade config print [path] [out]` | Print + write the resolved config with provenance. |

### Context

| Command | Description |
|---|---|
| `ade context generate [out]` | Generate the deterministic project context. |
| `ade context check [out]` | Report absent / up-to-date / stale (no writes). |
| `ade context print [out]` | Print the stored context as Markdown. |
| `ade context pack [mode] [diff]` | Build a budgeted context pack (`chill`/`normal`/`expert`). |
| `ade loop run [input] [out]` | Run a bounded execution loop with deterministic harness attempts and targeted correction evidence. |
| `ade delivery close [run] [out]` | Close a structured run summary into JSON, dossier Markdown and final notification artifacts. |
| `ade run observe [run] [out]` | Render a structured run trace into timeline, budget, controls and audit artifacts. |
| `ade quality gate [input] [out]` | Evaluate staging/production quality evidence into a versioned gate report. |
| `ade delegation plan [input] [out]` | Plan isolated agent delegation, Git branches, validations and blocked tasks without executing agents. |
| `ade graph execute [input] [out]` | Execute a delivery graph with deterministic mock providers, handoffs, resume state and blocked-node reporting. |

### Review & fix

| Command | Description |
|---|---|
| `ade review [--staged \| --base <ref>] [--run-tools] [--provider <name>] [--json]` | Run the deterministic review (config, context, rule hygiene), optionally orchestrating configured tools and/or preparing a provider pack. |
| `ade fix [--dry-run]` | Apply safe, mechanical fixes (create missing config, refresh stale context). |

Backlog, prompt, specialist and status commands are listed in `ade --help` and
documented in [MANUAL_WORKFLOW.md](./MANUAL_WORKFLOW.md).

## Result model

Every review finding is normalized and states its origin:

```json
{
  "rule": "context/staleness",
  "severity": "warn",
  "message": "Project context is stale…",
  "file": "optional/path",
  "suggestion": "Run `ade context generate`.",
  "origin": "deterministic"
}
```

`origin` is `deterministic` (ADE's own checks and tool orchestration) or
`provider` (an optional AI adapter). By default everything is deterministic.
`ade review --json` emits the full, versioned `ReviewResult` for CI.

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Success / healthy / no error findings |
| `1` | Problems found (config errors, error findings, failed tools, doctor problems) |
| `2` | Usage error (unknown flag, missing option value) |

Context-specific: `ade context check` returns `0` up-to-date, `1` stale, `2`
absent. All commands are non-interactive and safe to run in CI.

## Optional AI provider

`ade review --provider <name>` prepares a budgeted **review pack** (a context
pack: diff scope + applicable rules + compact context) and writes it. It calls a
provider **only** if an adapter for that name has been registered; otherwise it
just writes the pack. By default:

- no API key is required;
- no code leaves your machine;
- providers are explicit and interchangeable (OpenAI, Anthropic, GitHub Models,
  a local/Ollama model, or an MCP client) via the adapter interface, which can
  be added without changing the base commands.

## Security notes

- ADE never makes network calls or LLM calls implicitly.
- Secrets and API tokens must never be stored in `ade.config.*` — a secret-like
  key is a validation error. Provide secrets at runtime to whatever calls a
  provider.
- Context and packs exclude sensitive files (config `sensitive` globs) and never
  include file contents, environment values or binaries.
- Path arguments are constrained to the project directory (path-traversal guard).
- Cross-platform: Windows, macOS and Linux (covered by CI on Linux + Windows).
