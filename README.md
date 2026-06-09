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
- produce normalized JSON and Markdown backlog outputs;
- run deterministic backlog quality checks;
- export one Markdown file per backlog item for manual review.

It deliberately does not yet:

- call OpenAI, Claude, Ollama, or any other model provider;
- run autonomous agents;
- create remote issues;
- use n8n;
- use a database;
- provide a web dashboard.

## Repository Map

- [docs/VISION.md](docs/VISION.md)
- [docs/ROADMAP.md](docs/ROADMAP.md)
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/AGENTS.md](docs/AGENTS.md)
- [docs/WORKFLOW.md](docs/WORKFLOW.md)
- [docs/MANUAL_WORKFLOW.md](docs/MANUAL_WORKFLOW.md)
- [docs/BACKLOG_MODEL.md](docs/BACKLOG_MODEL.md)
- [docs/MVP.md](docs/MVP.md)
- [docs/contracts/PO_PM_OUTPUT_CONTRACT.md](docs/contracts/PO_PM_OUTPUT_CONTRACT.md)
- [docs/DECISIONS/ADR-0001-documentation-first.md](docs/DECISIONS/ADR-0001-documentation-first.md)
- [templates/](templates/) reusable manual role templates for UX/UI, Front-end, Back-end, QA, and Tech Lead prompts

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

### 4. Run a deterministic backlog quality review

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

### 5. Export backlog items to local Markdown files

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
9. Review the exported items manually before implementation
```

This keeps the human in control while making each step repeatable and inspectable.

## Current Status

AI Delivery Engine currently defines the product vision, agent roles, backlog model, workflow, MVP scope, and the first local semi-automatic PO/PM delivery loop.
