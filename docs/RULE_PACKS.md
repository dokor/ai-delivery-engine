# Technical Profiles & Rule Packs

ADE centralizes **project-specific conventions** and orchestrates existing tools.
Rule packs do **not** replace ESLint, TypeScript, framework linters or static
analyzers — they encode the conventions those tools don't, give humans and AI
agents a coherent frame, and reference/orchestrate the tools for the rest.

## Activating packs

List the packs you want in `ade.config`. An entry can be an exact pack
(`frontend/next`) or a **profile namespace** (`frontend`, `backend`,
`development`) that expands to every pack under it:

```json
{
  "packs": ["development", "frontend/next", "backend/java"],
  "thresholds": { "serviceMaxLines": 250 }
}
```

```json
// activate a whole profile: `backend` expands to backend/*
{ "packs": ["development", "backend"] }
```

```bash
ade rules available     # all built-in packs
ade rules list          # rules of the active packs (id, severity, kind, why, fix)
ade rules list --json   # machine-readable, for CI/agents
ade review              # runs the deterministic pack rules (e.g. service size)
```

## Available packs (V1)

| Pack | Focus |
|---|---|
| `development` | Cross-cutting: service size (deterministic), forbidden deps, test & doc conventions |
| `frontend/next` | Client/server boundary, data-access policy, feature structure, `next lint` |
| `frontend/react` | Component conventions, design tokens, hooks & a11y (ESLint) |
| `frontend/angular` | Module structure, smart/dumb components, angular-eslint |
| `frontend/wordpress` | Output escaping, hooks over core edits, WPCS (phpcs) |
| `backend/java` | Controller/service/repository layering, errors, transactions, validation |

Reference fixtures for each stack live in
[examples/rule-packs/](../examples/rule-packs/README.md).

## Rule kinds

Every rule declares how it is enforced, so nothing is duplicated blindly:

- **`deterministic`** — ADE checks it locally and can emit a finding
  (e.g. `development/service-size`).
- **`tool`** — ADE references/orchestrates an external tool (ESLint, phpcs, …)
  instead of reimplementing it. Configure the tool under `tools` and run it with
  `ade review --run-tools`.
- **`guidance`** — a project convention surfaced for humans and AI agents (e.g.
  fed into a review pack via `ade review --provider`), not mechanically enforced.

Each rule carries an `id`, `severity`, `explanation` (what), `rationale` (why)
and `suggestion` (how to fix), and is emitted through the same normalized finding
model and JSON output as the rest of `ade review`.

## The service-size rule (configurable)

`development/service-size` is the deterministic example: it flags service files
(default globs `**/*service*.*`, `**/services/**/*.*`) exceeding a configurable
line threshold.

- Threshold: `thresholds.serviceMaxLines` (default **250**).
- Severity: `warn` — it is a **refactoring recommendation**, not a hard
  architectural assertion. Raise the threshold if a size is intentional.

```jsonc
// warn services over 300 lines instead of 250
{ "packs": ["development"], "thresholds": { "serviceMaxLines": 300 } }
```

## Not a linter replacement

Where a concern is already covered by a mature tool, the pack rule is `tool`
(orchestrated/referenced), not a reimplementation. ADE's added value is the
project-specific layer and a coherent, homogeneous surface (CLI + JSON) across
deterministic checks, tool orchestration and AI guidance.
