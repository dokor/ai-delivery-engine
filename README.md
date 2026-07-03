# AI Delivery Engine

AI Delivery Engine is a documentation-first foundation for a future system that coordinates multiple AI agents like a small software delivery team.

The goal is not to build autonomous agents yet. The goal of this first repository iteration is to make the product intent, operating model, and MVP boundaries explicit before writing orchestration code.

## What Problem It Solves

Teams can already use AI to write specs, generate UI ideas, suggest code, and draft tests. The hard part is delivery coordination:

- who owns each step
- what context is passed forward
- how backlog items are created and refined
- where human approval is required
- what should stay manual before automation is trusted

AI Delivery Engine is meant to turn ad hoc prompting into a repeatable delivery workflow.

## Target Users

- solo founders and freelancers shipping client work
- small product teams that want AI help without losing control
- tech leads who want structured AI collaboration instead of one-off prompts

## V1 In One Line

V1 is a manual, local-first, documentation-driven workflow for turning a project brief into a structured backlog with human review at every important step.

## Current MVP Status

The current MVP is not an autonomous agent platform yet. It is a local semi-automatic delivery loop.

It can already:

- read a local project brief;
- generate a deterministic PO/PM backlog draft;
- generate a manual PO/PM prompt to copy into an AI assistant;
- ask the AI assistant for an importable JSON response;
- import and validate a manually saved PO/PM JSON response;
- generate specialist prompts from individual exported backlog items;
- produce normalized JSON and Markdown backlog outputs;
- run deterministic backlog quality checks;
- export one Markdown file per backlog item for manual review;
- generate batch specialist prompts from the export manifest for supported owner roles, with a generated local index;
- check saved specialist responses locally with deterministic Markdown and JSON reports;
- summarize the local workflow state from generated files under `outputs/`;
- list and enrich GitHub issues, and prepare issue development (branch + specialist prompts), through `gh` CLI scripts driven by Claude Code (see [GitHub Issue Workflow](#github-issue-workflow-claude-code) below).

It deliberately does not yet:

- call OpenAI, Claude, Ollama, or any other model provider directly from ADE's own code (Claude Code plays that role manually today);
- run autonomous agents without a human approval gate;
- merge pull requests automatically;
- use n8n;
- use a database;
- provide a web dashboard.

## Repository Map

- [docs/VISION.md](docs/VISION.md)
- [docs/ROADMAP.md](docs/ROADMAP.md)
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/AGENTS.md](docs/AGENTS.md)
- [docs/roles/](docs/roles/) detailed role specifications (responsibilities, scope boundaries, follow-up work)
- [docs/WORKFLOW.md](docs/WORKFLOW.md)
- [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md)
- [docs/MANUAL_WORKFLOW.md](docs/MANUAL_WORKFLOW.md)
- [docs/V1_ROLE_HANDOFFS.md](docs/V1_ROLE_HANDOFFS.md) context handoff map between V1 roles
- [docs/V1_APPROVAL_GATES.md](docs/V1_APPROVAL_GATES.md) the human approval gates for the V1 workflow
- [docs/V1_READINESS_CHECKLIST.md](docs/V1_READINESS_CHECKLIST.md)
- [docs/GITHUB_WORKFLOW.md](docs/GITHUB_WORKFLOW.md) the three GitHub automation loops (issue enrichment, issue development, human review/merge) driven by Claude Code
- [docs/BACKLOG_MODEL.md](docs/BACKLOG_MODEL.md)
- [docs/MVP.md](docs/MVP.md)
- [docs/contracts/PO_PM_OUTPUT_CONTRACT.md](docs/contracts/PO_PM_OUTPUT_CONTRACT.md)
- [docs/contracts/SPECIALIST_RESPONSE_CONTRACT.md](docs/contracts/SPECIALIST_RESPONSE_CONTRACT.md)
- [docs/DECISIONS/ADR-0001-documentation-first.md](docs/DECISIONS/ADR-0001-documentation-first.md)
- [templates/](templates/) reusable manual role templates for UX/UI, Front-end, Back-end, QA, Tech Lead, Legal & Compliance, Security, DevOps, Data & Analytics, and Customer Success perspectives, including capability-aware guidance for Front-end and Back-end (see [templates/backend-capability-guidance.md](templates/backend-capability-guidance.md))
- [scripts/](scripts/) `issues-enrich.sh` and `issue-dev.sh`, the shell entry points for the GitHub issue workflow
- [src/github/](src/github/) GitHub integration code (issue fetching, enrichment prompts, PR creation, comments/labels) used by the GitHub issue workflow
- [tests/](tests/) `node:test` unit tests covering backlog types, brief parsing, PO/PM agent modes, specialist prompt building, specialist checks, and safe path handling
- [examples/demo-project/README.md](examples/demo-project/README.md) complete demo fixture for the full local V1 workflow
- [examples/demo-v1-roles/README.md](examples/demo-v1-roles/README.md) compact demo fixture that covers every current V1 core role in one backlog
- [examples/specialist-responses/README.md](examples/specialist-responses/README.md) fixture examples of contract-compliant specialist responses

## Recommended First Implementation Approach

1. Keep the source of truth in Markdown and simple JSON examples.
2. Start with one agent flow: `brief -> PO/PM -> backlog draft`.
3. Use manual prompts and manual approval instead of API calls.
4. Store backlog items in files before introducing a database.
5. Add automation only after the input, output, and review contracts feel stable.

## Non-Goals For This Stage

- no real LLM integrations
- no autonomous execution
- no complex dashboard
- no external API coupling

## Local MVP Workflow

Install dependencies:

```bash
pnpm install
```

Run type checking and unit tests:

```bash
pnpm typecheck
pnpm test
```

`pnpm test` runs the `node:test` suite under `tests/`, covering backlog types, brief parsing (including PO/PM agent modes), specialist prompt building, specialist response checks, and safe path handling.

### 1. Generate a deterministic backlog draft

```bash
pnpm backlog:run
```

Default input:

```txt
src/examples/sample-brief.md
```

Default outputs:

```txt
outputs/sample-brief.backlog.json
outputs/sample-brief.backlog.md
```

This command proves the basic flow locally:

```txt
brief -> PO/PM runner -> backlog draft
```

You can also pass a custom brief path and optional output directory:

```bash
node --experimental-strip-types src/index.ts path/to/brief.md outputs
```

### 2. Generate a manual PO/PM prompt

```bash
pnpm prompt:po
```

This command writes a provider-agnostic Markdown prompt under `outputs/`, ready to copy into ChatGPT, Codex, Claude, or another assistant manually.

The prompt asks for a fenced importable JSON response aligned with [docs/contracts/PO_PM_OUTPUT_CONTRACT.md](docs/contracts/PO_PM_OUTPUT_CONTRACT.md). A sample valid response lives at [src/examples/sample-po-pm-output.json](src/examples/sample-po-pm-output.json).

You can also pass a custom brief path and optional output directory:

```bash
node --experimental-strip-types src/promptPo.ts path/to/brief.md outputs
```

### 3. Import a manually saved PO/PM AI response

```bash
pnpm import:po
```

By default, the importer reads [src/examples/sample-po-pm-output.json](src/examples/sample-po-pm-output.json), validates it against the PO/PM contract and backlog draft types, and writes:

```txt
outputs/sample-po-pm-output.normalized.backlog.json
outputs/sample-po-pm-output.normalized.backlog.md
```

You can also pass a custom input path and optional output directory:

```bash
node --experimental-strip-types src/importPo.ts path/to/po-pm-response.json outputs
```

### 4. Generate a specialist prompt from an exported backlog item

```bash
pnpm prompt:specialist
```

The command accepts:

1. a role name
2. a backlog item Markdown file path
3. an optional output directory

Example:

```bash
node --experimental-strip-types src/promptSpecialist.ts frontend outputs/exported-items/story-002.md outputs
```

Supported roles:

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

By default, the command reads the matching role template from `templates/`, reads the selected backlog item Markdown file, and writes a provider-agnostic prompt under `outputs/` using the format:

```txt
<item-id>.<role>.prompt.md
```

For example:

```txt
outputs/story-002.frontend.prompt.md
```

### 5. Run a deterministic backlog quality review

```bash
pnpm backlog:review
```

By default, the review reads [src/examples/sample-po-pm-output.json](src/examples/sample-po-pm-output.json), validates the backlog shape first, then writes:

```txt
outputs/backlog-review.md
outputs/backlog-review.json
```

The review reports simple deterministic findings such as missing acceptance criteria, missing task owner roles, orphan stories or tasks, weak descriptions, missing assumptions or open questions, and missing risk items.

You can also pass a custom backlog JSON path and optional output directory:

```bash
node --experimental-strip-types src/reviewBacklog.ts path/to/backlog.json outputs
```

### 6. Export backlog items to local Markdown files

```bash
pnpm backlog:export
```

By default, the exporter reads [src/examples/sample-po-pm-output.json](src/examples/sample-po-pm-output.json), validates the backlog first, writes one Markdown file per item under `outputs/exported-items/`, and also generates `outputs/exported-items/manifest.json`.

Each item file includes the item title, description, type, priority, status, owner role when present, parent ID when present, acceptance criteria for stories, assumptions and notes when present, and suggested labels.

The manifest includes the source backlog path, export timestamp, exported item count, and one entry per exported Markdown file with the item ID, title, type, priority, status, owner role when present, parent ID when present, file path, and suggested labels.

You can also pass a custom backlog JSON path and optional export directory:

```bash
node --experimental-strip-types src/exportBacklog.ts path/to/backlog.json outputs/exported-items
```

### 7. Generate batch specialist prompts from the export manifest

```bash
pnpm prompt:specialists
```

By default, the command reads `outputs/exported-items/manifest.json`, maps supported `ownerRole` values to the matching specialist templates under [templates/](templates/), and writes provider-agnostic Markdown prompts under `outputs/specialist-prompts/`.

It also writes:

```txt
outputs/specialist-prompts/index.json
outputs/specialist-prompts/README.md
```

The generated index includes the source manifest path, generation timestamp, manifest item count, generated prompt count, skipped item count, and one entry per generated prompt with the item ID, item title, item type, owner role, specialist role, prompt file path, and source backlog item file path.

The generated Markdown README makes the batch easy to inspect manually by summarizing the run and linking each generated prompt file.

Supported role mappings:

```txt
ux_ui -> ux-ui
frontend -> frontend
backend -> backend
qa -> qa
tech_lead -> tech-lead
legal_compliance -> legal-compliance
security -> security
devops -> devops
data_analytics -> data-analytics
customer_success -> customer-success
```

Items with missing or unsupported owner roles, such as `po_pm`, are skipped.

Suggested output filenames:

```txt
outputs/specialist-prompts/task-003.ux-ui.prompt.md
outputs/specialist-prompts/task-004.frontend.prompt.md
```

You can also pass a custom manifest path and optional output directory:

```bash
node --experimental-strip-types src/promptSpecialists.ts path/to/manifest.json outputs/specialist-prompts
```

### 8. Check local project status

```bash
pnpm project:status
```

By default, the command inspects local generated files under `outputs/` and prints a concise summary of whether the deterministic backlog draft, PO/PM prompt, normalized backlog, backlog review report, exported Markdown items, and export manifest exist.

When available, it also reports the number of backlog review findings and the number of exported items, then suggests the next local step.

The command also writes:

```txt
outputs/project-status.json
```

### 9. Check a specialist response locally

```bash
pnpm specialist:check
```

By default, the checker reads `examples/specialist-responses/frontend-story-002.md`, validates the response against the basic specialist response contract structure, and writes:

```txt
outputs/frontend-story-002.specialist-check.md
outputs/frontend-story-002.specialist-check.json
```

The checker looks for:

- `# Specialist Response`
- required `##` sections such as `Role`, `Scope`, `Item Notes`, `Assumptions`, `Open Questions`, `Risks`, and `Suggested Backlog Updates`
- a supported role value
- at least one backlog item ID reference
- weak or very short content
- suspicious claims such as direct file edits, automatic status changes, remote issue creation, or automatic approval

The intended specialist loop is:

```txt
specialist prompt -> manual assistant response saved as Markdown -> specialist:check -> human review
```

The checker is deterministic and structure-focused. It does not grade specialist quality semantically, approve work automatically, or decide whether a response should be accepted. A human still decides whether the response is accepted, revised, or rejected.

You can also pass a custom specialist response Markdown path and optional output directory:

```bash
node --experimental-strip-types src/specialistCheck.ts examples/specialist-responses/frontend-story-002.md outputs
```

### 10. Validate the demo workflow

```bash
pnpm demo:validate
```

This command runs the full local workflow against `examples/demo-project/` with explicit demo paths, then verifies that the expected backlog draft, prompt, normalized backlog, review outputs, export manifest, and project status files were generated under `outputs/demo-project/`.

## GitHub Issue Workflow (Claude Code)

Beyond the local file-based loop, ADE also drives three GitHub automation loops through Claude Code and the `gh` CLI, defined in [CLAUDE.md](CLAUDE.md) and documented in full in [docs/GITHUB_WORKFLOW.md](docs/GITHUB_WORKFLOW.md):

1. **Issue enrichment** — Claude Code lists open GitHub issues, picks out the ones missing the `backlog-refined` or `ready-for-dev` labels, rewrites their descriptions with a clear objective, at least three acceptance criteria, and relevant technical context, splits oversized issues into sub-issues, and labels the result.
2. **Issue development** — starting from a `ready-for-dev` issue, Claude Code creates a branch, implements the change, runs `pnpm typecheck && pnpm test`, generates Security, QA, and Tech Lead specialist reviews, opens a PR with those reviews embedded in the body, and comments on the issue with a link to the PR. If the issue is not yet enriched, this loop stops at a mandatory PO/PM gate and waits for explicit human validation before any branch or code is created.
3. **Review and merge** — entirely manual: a human reviews the PR and merges it. ADE never merges automatically.

Prerequisites: the [GitHub CLI](https://cli.github.com) (`gh auth login`) and Claude Code. Optionally set `GITHUB_REPO=<owner>/<repo>` to avoid repeating `--repo` on each command.

Helper scripts:

```bash
# List issues that still need enrichment
pnpm issues:enrich

# Prepare a branch and specialist prompts for a ready-for-dev issue
pnpm issue:dev <issue-number>
```

These scripts prepare local state (branch, prompts); Claude Code performs the actual enrichment, implementation, and review steps described above.

## End-To-End Manual Loop

The intended V1 usage is:

```txt
1. Write or choose a local brief
2. Run pnpm backlog:run for a deterministic baseline
3. Run pnpm prompt:po to generate a manual PO/PM prompt
4. Copy the prompt into an AI assistant
5. Save the AI response as a local JSON file
6. Run pnpm import:po to validate and normalize it
7. Run pnpm backlog:review to check backlog quality
8. Run pnpm backlog:export to create one Markdown file per item
9. Run pnpm prompt:specialists or pnpm prompt:specialist for the items you want to refine
10. Save the manual specialist response as Markdown and run pnpm specialist:check
11. Review the specialist check outputs and decide manually what to accept before implementation
```

This keeps the human in control while making each step repeatable and inspectable.

## Releases

- **Beta**: `pnpm release:beta` publishes an npm prerelease (`X.Y.Z-beta.N`, `beta` dist-tag) directly from your machine. It runs typecheck + tests first, then reverts the local version bump so `package.json` on `main` never carries a beta version. Install with `npm install @alelouet/ai-delivery-engine@beta`.
- **Stable releases**: fully automated by GitHub Actions (`.github/workflows/release-please.yml`, powered by [release-please](https://github.com/googleapis/release-please)). It watches `main` for Conventional Commits (`feat:`, `fix:`, `feat!:`, ...), maintains a release PR with the next version bump and `CHANGELOG.md`, and on merge creates the git tag, the GitHub Release, and publishes to npm (`latest` dist-tag). Manual `npm version` / `npm publish` for stable releases is no longer used.

## Current Status

AI Delivery Engine currently defines the product vision, agent roles, backlog model, workflow, MVP scope, and the first local semi-automatic PO/PM delivery loop. It also now drives a GitHub issue enrichment and development workflow through Claude Code, backed by a growing `node:test` unit test suite and capability-aware Front-end and Back-end role guidance.
