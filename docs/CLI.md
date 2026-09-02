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
| `ade run advance [run] [out]` | Apply Project Run actions (pause, resume, retry, cancel, decisions, gate override, takeover), recompute the run state and name the next node or the exact blocker. Refusals are audited, validated nodes are never replayed. |
| `ade setup contract [--json\|--human] [--template <id>]` | Print the versioned catalogue of what a repository needs to be ADE-ready, or the ADE-owned content that satisfies one requirement. See [PROJECT_SETUP_CONTRACT.md](./PROJECT_SETUP_CONTRACT.md). |
| `ade setup check [out] [--json]` | Evaluate this repository against that contract: `ready`, `incomplete` or `invalid`. Exit `0` when ready, `1` otherwise. |
| `ade issue plan --json < input.json` | Resolve the repository-owned next issue-lifecycle step. |
| `ade delivery plan --json < input.json` | Resolve the versioned ADE delivery contract consumed by schedulers and Git/PR control planes. |

### Delivery-plan contract

`ade delivery plan --json` reads a GitHub issue from standard input and returns
`ade.delivery-plan/v1`. The result is either `supported`, with the admission
decision, implementation profile, deterministic rule ids, specialist review
profiles, bounded correction policy, human gates and publication readiness; or
`unsupported`, with a machine-readable reason. A caller can supply
`negotiation.acceptedVersions` and `negotiation.requiredCapabilities`; ADE
returns `NO_MUTUAL_CONTRACT_VERSION` or `MISSING_REQUIRED_CAPABILITY` rather
than silently falling back.

The repository, not a scheduler, selects delivery behavior in
`issueLifecycle.deliveryPlan`:

```json
{
  "profiles": {
    "implementation": { "mode": "assisted", "context": "full", "allowProvider": true },
    "security": { "mode": "assisted", "context": "compact", "allowProvider": true }
  },
  "rules": [{ "id": "security/no-secrets", "severity": "error" }],
  "issueLifecycle": {
    "deliveryPlan": {
      "implementationProfile": "implementation",
      "reviewProfiles": ["security"],
      "validationRuleIds": ["security/no-secrets"],
      "maxCorrectionAttempts": 1,
      "requireHumanApprovalBeforePublish": true
    }
  }
}
```

An absent `implementationProfile`, an unknown profile/rule, or incompatible
negotiation returns `unsupported`: consumers must not infer profiles from issue
keywords or substitute local prompts. The contract exposes only config source
labels, configured profile/rule/pack identifiers and policy keys as provenance;
it never includes credentials, environment values or prompt contents.

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
