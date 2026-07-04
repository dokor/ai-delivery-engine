# V1 Critical Path

This document lists the V1 workflows on ADE's critical path — from project
input to normalized workflow outputs — with their critical inputs, outputs,
exit codes, and the automated tests that guard them. It exists so the base is
provably reliable before more profiles or integrations are layered on.

Guiding constraints for every workflow below:

- deterministic — same inputs produce the same outputs;
- local-first — no LLM, API key or network access required by default;
- observable failures — a missing prerequisite yields a clear message and a
  non-zero exit code, never a silent partial result.

## Critical Path Stages

1. Open a project (any directory with the relevant sources).
2. Load and validate configuration (`ade config:print`).
3. Resolve profiles, rules and context sources (config + `ade context:generate`).
4. Run a local workflow (backlog / prompt / export / specialist commands).
5. Produce normalized artifacts under `outputs/`.
6. Return a CLI result with a coherent exit code.
7. Emit a clear diagnostic when a prerequisite is missing.

## Workflows, Inputs, Outputs And Exit Codes

| Workflow | Command | Critical input | Critical output | Exit codes |
|---|---|---|---|---|
| Config resolution | `ade config:print [configPath] [outDir]` | `ade.config.{ts,js,mjs,json}` + presets | `outputs/config/ade.config.resolved.json` + provenance | `0` valid · `1` validation error (unknown key, bad enum, cycle, secret) |
| Context generation | `ade context:generate [outDir]` | repo sources + resolved config | `outputs/context/context.{json,md}` | `0` generated · `1` config error |
| Context freshness | `ade context:check [outDir]` | stored `context.json` + current sources | freshness verdict (no writes) | `0` up-to-date · `1` stale · `2` absent |
| Context print | `ade context:print [outDir]` | stored `context.json` | Markdown to stdout | `0` printed · `1` no context |
| Context pack | `ade context:pack [mode] [diffFile]` | resolved config + project context + optional diff | `outputs/context/context-pack.{md,manifest.json}` | `0` ok · `1` config error |
| Backlog draft | `ade backlog:run [brief] [outDir]` | brief Markdown | `*.backlog.{json,md}` | `0` ok · `1` failure |
| PO/PM prompt | `ade prompt:po [brief] [outDir]` | brief Markdown | `*.po-pm.prompt.md` | `0` ok · `1` failure |
| Import PO/PM | `ade import:po [response] [outDir]` | PO/PM JSON response | `*.normalized.backlog.{json,md}` | `0` ok · `1` invalid/contract failure |
| Backlog review | `ade backlog:review [backlog] [outDir]` | backlog JSON | `backlog-review.{json,md}` | `0` ok · `1` failure |
| Backlog export | `ade backlog:export [backlog] [outDir]` | backlog JSON | `exported-items/*.md` + `manifest.json` | `0` ok · `1` failure |
| Specialist prompt | `ade prompt:specialist <role> <item.md> [outDir]` | role + exported item | `<item>.<role>.prompt.md` | `0` ok · `1` failure |
| Specialist prompts (batch) | `ade prompt:specialists [manifest] [outDir]` | export manifest | `specialist-prompts/*` + index | `0` ok · `1` failure |
| Specialist check | `ade specialist:check <response.md> [outDir]` | specialist response Markdown | `*.specialist-check.{json,md}` | `0` ok · `1` failure |
| Project status | `ade project:status [outDir]` | generated `outputs/` files | `project-status.json` | `0` ok · `1` failure |
| Demo validation | `ade demo:validate` | `examples/demo-project/` | full artifact set under `outputs/demo-project/` | `0` all present · `1` missing artifact |

## Non-Deterministic / External Components

- **AI provider calls** — not part of V1; ADE never calls a provider itself, so
  no mock is needed. Provider-facing profiles only describe *how* context would
  be prepared.
- **Wall-clock timestamps** — excluded from fingerprinted, stability-tested
  artifacts (context). Where a timestamp is informational (e.g. project status)
  it is not part of a determinism assertion.
- **Filesystem layout** — tests run against isolated temp projects, never the
  developer's working tree.

## Test Coverage Map

Automated `node:test` suites under `tests/` guarding the critical path:

- `tests/config/loadConfig.test.ts` — presets, deterministic merge + provenance,
  overrides, extends cycles, schema errors, secret rejection, missing config,
  CLI/CI/MCP parity (repeated resolution is identical).
- `tests/context/ignoreMatcher.test.ts` — ignore/sensitive glob matching.
- `tests/context/collectContext.test.ts` — determinism, stack/module/command/ADR
  inventory, ignore filtering, secret/env exclusion, section customization,
  fingerprint change on config change.
- `tests/context/checkContext.test.ts` — absent / up-to-date / stale states.
- `tests/contextpack/buildContextPack.test.ts` — token estimation, sensitive
  exclusion, budget reduction ladder, required-item protection, over-budget flag,
  deterministic ordering, indicative-estimate manifest.
- `tests/contextpack/modes.test.ts` — chill/normal/expert presets and config
  profile overrides.
- `tests/contextpack/cache.test.ts` — cache-key stability and invalidation on
  content/config/mode/budget changes, read/write round-trip.
- `tests/cli/contextPack.test.ts` — `context:pack` in a separate process:
  manifest contract, cache miss/hit, per-mode budgets.
- `tests/cli/cliCommands.test.ts` — CLI commands run in a **separate process**,
  asserting exit codes and JSON output contracts for `config:print` and the
  context lifecycle.
- Existing suites — backlog types, brief parsing, PO/PM modes, specialist prompt
  building, specialist checks, safe path handling.

## Running Locally

```bash
pnpm typecheck            # types
pnpm test                 # full node:test suite
pnpm test:coverage        # targeted critical-path coverage report
pnpm build                # build smoke check
```

The CI workflow (`.github/workflows/ci.yml`) runs type-check, tests and build on
Linux and Windows, plus a dedicated coverage job, on every push and pull request.
