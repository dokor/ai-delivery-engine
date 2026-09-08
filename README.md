# AI Delivery Engine

AI Delivery Engine (**ADE**) is a documentation-first, local-first delivery runtime for coordinating AI-assisted software work with explicit contracts, deterministic validation and human approval gates.

ADE is **provider-neutral**. It does not define one workflow for Claude Code and another for Codex. The repository workflow, readiness rules, specialist perspectives, validation gates and publication boundaries are the same regardless of which compatible coding provider executes a step.

The canonical coding-agent instruction file is the root [`AGENTS.md`](AGENTS.md). Provider-specific files such as [`CLAUDE.md`](CLAUDE.md) are adapters only and must defer to that common contract.

## What ADE owns

ADE turns ad hoc prompting into a repeatable delivery workflow by owning:

- project setup/readiness contracts;
- project configuration and context;
- issue planning and refinement/enrichment;
- validated implementation handoffs;
- technical rule packs;
- specialist profiles and review instructions;
- deterministic validation;
- bounded correction/review loops;
- explicit human approval boundaries.

A coding provider implements the work ADE has admitted. It does not redefine the lifecycle.

## Provider-neutral delivery flow

```text
Issue / work request
→ ADE planning
→ refinement/enrichment when needed
→ validated implementation handoff
→ Codex / Claude Code / compatible coding provider
→ deterministic validation
→ ADE specialist reviews
→ bounded corrections
→ publication gate
→ PR
→ explicit human review / merge
```

Provider choice must not alter:

- readiness criteria;
- objective or scope;
- acceptance criteria;
- specialist selection;
- validation requirements;
- publication ownership;
- final human merge approval.

## Agent instruction convention

New ADE-enabled repositories should expose a root `AGENTS.md` describing the commands, delivery gates, validation expectations and human approval boundaries that every coding agent must follow.

Provider-specific files are optional adapters:

```text
AGENTS.md        ← canonical ADE/repository agent contract
CLAUDE.md        ← optional Claude Code adapter → AGENTS.md
other provider   ← receives the same AGENTS.md + ADE handoff
```

For an execution, use this authority order:

1. platform and safety restrictions;
2. the structured ADE execution / implementation handoff;
3. the repository root `AGENTS.md`;
4. repository-local technical documentation and ADE-selected skills;
5. free-form issue/comment prose as reference material.

Historical projects that only contain `CLAUDE.md` remain detectable during migration, but `AGENTS.md` is the canonical convention for new setups.

## Core CLI

Install dependencies for this repository:

```bash
pnpm install
pnpm typecheck
pnpm test
```

The stable `ade` CLI includes the main local runtime surfaces:

```bash
ade init
ade doctor
ade config validate
ade context generate
ade context check
ade context pack normal
ade setup contract --json
ade setup check --json
ade issue plan --json
ade delivery plan --json
ade review --staged --json
ade rules list
ade fix --dry-run
```

ADE commands are designed to work locally and deterministically. Provider calls are never implicit runtime magic: an orchestrator or interactive coding client explicitly supplies the provider when assisted execution is needed.

## Project setup contract

ADE publishes one machine-readable source of truth for repository readiness:

```bash
ade setup contract --json
ade setup check --json
```

The setup contract covers, among other things:

- `ade.config.json`;
- valid ADE configuration;
- generated/fresh project context;
- root `AGENTS.md` as the canonical agent instruction file;
- documentation and ADR locations;
- rule packs and configured tools;
- GitHub workflow labels;
- issue templates.

ADE itself has no need to mutate GitHub during local setup inspection. Requirements that cannot be observed locally can be returned as `unverifiable`; an external consumer such as ADE Control Plane may supply remote observations and repair missing GitHub state.

See [docs/PROJECT_SETUP_CONTRACT.md](docs/PROJECT_SETUP_CONTRACT.md).

## Issue planning and implementation handoff

ADE separates issue prose from executable delivery scope.

An issue is planned through:

```bash
ade issue plan --json
```

Typical outcomes are:

- `enrich` — the issue needs refinement before development;
- `develop` — ADE returns a validated implementation handoff;
- `wait` / `none` — a decision or other condition blocks implementation.

A development-ready issue should contain at minimum:

- a clear objective;
- at least three acceptance criteria;
- sufficient implementation context and constraints.

The structured `ade.implementation-handoff/v1` is authoritative for implementation scope. Free-form GitHub prose outside the handoff remains reference material.

## Issue enrichment

When ADE requests enrichment, the selected coding provider produces an improved issue body only. It should include:

- objective;
- at least three checkbox acceptance criteria;
- relevant technical context;
- constraints/risks where material.

An enrichment-only step must not modify repository files. The issue is replanned after enrichment and development starts only if ADE admits it.

## Specialist roles

ADE specialist roles are delivery perspectives, not necessarily separate autonomous workers. The same provider may execute multiple bounded review passes when requested by ADE.

Supported perspectives include:

- `po-pm`
- `ux-ui`
- `frontend`
- `backend`
- `qa`
- `tech-lead`
- `legal-compliance`
- `security`
- `devops`
- `data-analytics`
- `customer-success`
- `seo`
- `cleanup`

The role model and boundaries are documented in [docs/AGENTS.md](docs/AGENTS.md) and [docs/V1_ROLE_HANDOFFS.md](docs/V1_ROLE_HANDOFFS.md).

## Local backlog workflow

ADE still supports the documentation-first/manual workflow that predates the fully orchestrated issue lifecycle.

Useful commands include:

```bash
pnpm backlog:run
pnpm prompt:po
pnpm import:po
pnpm backlog:review
pnpm backlog:export
pnpm prompt:specialist <role> <item.md>
pnpm prompt:specialists
pnpm specialist:check <response.md>
pnpm project:status
pnpm demo:validate
```

Generated prompts are provider-neutral and can be used with ChatGPT, Codex, Claude or another compatible assistant.

## GitHub workflow

ADE's GitHub workflow is no longer Claude-specific.

```text
GitHub issue
→ ADE plan
→ optional enrichment
→ implementation handoff
→ selected provider
→ ADE validation/reviews
→ PR
→ human merge
```

For interactive/local use, the GitHub CLI can be used by the human or agent where permitted. In an orchestrated environment such as ADE Control Plane, the orchestrator owns Git/GitHub side effects and the coding provider must not duplicate them.

See [docs/GITHUB_WORKFLOW.md](docs/GITHUB_WORKFLOW.md).

## ADE Control Plane integration

ADE Control Plane consumes ADE's versioned contracts instead of reconstructing ADE semantics.

The intended boundary is:

```text
ADE Control Plane
  ├─ scheduling / persistence / quotas
  ├─ checkout/workspaces
  ├─ provider dispatch
  ├─ Git/GitHub side effects
  └─ observability
          ↓
ADE runtime
  ├─ setup/readiness
  ├─ issue lifecycle
  ├─ implementation handoff
  ├─ rules / profiles / skills
  └─ validation / reviews
          ↓
Codex OR Claude Code
```

This keeps the provider replaceable without forking the delivery model.

## Project context and token budgeting

ADE can generate deterministic project context and token-budgeted context packs:

```bash
ade context generate
ade context check
ade context pack chill
ade context pack normal
ade context pack expert
```

Context packs include only the bounded material needed for a specific interaction and preserve a transparent manifest/provenance trail.

See [docs/TOKEN_BUDGET.md](docs/TOKEN_BUDGET.md).

## Rule packs and validation

ADE supports technical rule packs for stacks and cross-cutting concerns. Deterministic findings clearly identify their origin and can be used in CI without requiring any model provider.

See:

- [docs/RULE_PACKS.md](docs/RULE_PACKS.md)
- [docs/CLI.md](docs/CLI.md)
- [docs/V1_CRITICAL_PATH.md](docs/V1_CRITICAL_PATH.md)

## MCP

ADE also exposes a local MCP surface for clients that support it:

```bash
ade-mcp --project-root /absolute/path/to/project
```

MCP exposes the same ADE core contracts; it does not add a second orchestration model and does not make a provider mandatory.

See [docs/MCP.md](docs/MCP.md).

## Repository map

- [`AGENTS.md`](AGENTS.md) — canonical provider-neutral coding-agent instructions
- [`CLAUDE.md`](CLAUDE.md) — Claude Code adapter to `AGENTS.md`
- [`ade.config.json`](ade.config.json) — ADE configuration for this repository
- [`docs/AGENTS.md`](docs/AGENTS.md) — ADE specialist role model
- [`docs/GITHUB_WORKFLOW.md`](docs/GITHUB_WORKFLOW.md) — provider-neutral GitHub delivery flow
- [`docs/DELIVERY_HARNESS.md`](docs/DELIVERY_HARNESS.md) — provider-neutral execution request/result contract
- [`docs/PROJECT_SETUP_CONTRACT.md`](docs/PROJECT_SETUP_CONTRACT.md) — project readiness contract
- [`docs/V1_ROLE_HANDOFFS.md`](docs/V1_ROLE_HANDOFFS.md) — role handoff expectations
- [`docs/V1_APPROVAL_GATES.md`](docs/V1_APPROVAL_GATES.md) — human approval gates
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — architecture
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — roadmap
- [`templates/`](templates/) — specialist templates
- [`src/github/`](src/github/) — GitHub integration domain
- [`tests/`](tests/) — `node:test` suite

## Human approval boundary

ADE is designed to automate preparation, implementation support, validation and review while retaining an explicit final approval boundary.

**ADE must never silently auto-merge generated work.**

A human remains responsible for the final PR review/merge decision unless a future product contract explicitly changes that policy.

## Releases

- Beta: `pnpm release:beta`
- Stable releases: release-please via `.github/workflows/release-please.yml`

Production consumers should pin an exact compatible ADE version rather than rely on a floating `latest` runtime.
