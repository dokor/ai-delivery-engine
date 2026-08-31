# Roadmap

Status legend: **Delivered** (shipped in V1) · **Partial** · **Planned** (V2/V3).

Milestone mapping: **V1** covers the local runtime, reliable workflows and
technical profiles (Phases 0–4 foundation). **V2/V3** cover controlled
automation, external integrations and multi-project orchestration (Phases 5–6).

## Phase 0: Documentation Foundation — Delivered

Goal: define the operating model before building software.

Deliverables:

- repository structure
- product vision
- agent definitions
- backlog model
- workflow and MVP boundaries

## Phase 1: Manual Backlog Pilot — Delivered

Goal: prove that a brief can become a usable backlog with structured human review.

Deliverables:

- brief template
- PO/PM prompt template
- manual backlog review checklist
- sample backlog output format

Success signal:

`a human can use the repo docs to produce a backlog draft in a repeatable way`

## Phase 2: Semi-Automatic Orchestration — Delivered

Goal: add local tooling without removing human checkpoints.

Deliverables:

- local runner or CLI — delivered: the `ade` CLI (init, doctor, config, context, review, fix, rules, upgrade); see [CLI.md](./CLI.md)
- file-based project and backlog storage — delivered: artifacts under `outputs/`, resolved config and versionable project context
- agent run history — partial: `ade project:status` and generated artifacts (no dedicated run log yet)
- optional GitHub issue export — partial: Markdown export + manifest, plus the Claude Code `gh` issue workflow

Success signal:

`the flow is faster, but every important decision still requires human approval`

## Phase 3: Specialist Agent Support — Delivered

Goal: add role-specific refinement after the initial backlog exists.

Deliverables:

- UX/UI output templates
- front-end task breakdown
- back-end task breakdown
- QA checklist generation
- optional Tech Lead review step

## Phase 4: GitHub-Centered Delivery — Delivered (Claude Code workflow)

Goal: connect backlog items to implementation work.

Deliverables:

- issue creation
- issue enrichment
- implementation prompt generation
- pull request support

## Phase 4b: First External Integration — Delivered (V2, MCP)

Goal: let an AI client the user already chose reach ADE's context and rules
through a standard protocol, without ADE ever calling a provider.

Deliverables:

- programmatic API — delivered: `main`/`exports` on the package, one importable
  core (`runProjectReview`, `runDoctor`, `runFix`, context and rules) shared by
  the CLI, the CI and the server
- MCP server over stdio — delivered: `ade-mcp`, seven tools, no runtime
  dependency; see [MCP.md](./MCP.md)
- safety bounds — delivered: project-root confinement including symlinks,
  read-only by default, explicit caps, no silent truncation
- client configuration — delivered: Claude Code, Claude Desktop, Codex CLI

The two other candidates evaluated for this slot are replanned for V3: Git hooks
and an official GitHub Action. Only one external integration was to ship in V2.

Success signal:

`an agent can review a project with the same rules as the CLI, with no API key
and no provider call`

## Phase 5: Controlled Automation — Planned (V2/V3)

Goal: automate low-risk steps while keeping escalation paths for humans.

Deliverables:

- auto-triggered agent chains
- policy-based approvals
- exception handling
- quality gates

## Phase 6: Full Delivery Engine — Planned (V3)

Goal: support multi-project, mostly automated delivery workflows.

Deliverables:

- project cockpit
- audit trail
- reusable templates
- configurable automation modes
