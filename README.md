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

V1 is a manual, documentation-driven operating model for turning a project brief into a backlog that multiple AI roles can refine with human review at every important step.

## Repository Map

- [docs/VISION.md](docs/VISION.md)
- [docs/ROADMAP.md](docs/ROADMAP.md)
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/AGENTS.md](docs/AGENTS.md)
- [docs/WORKFLOW.md](docs/WORKFLOW.md)
- [docs/BACKLOG_MODEL.md](docs/BACKLOG_MODEL.md)
- [docs/MVP.md](docs/MVP.md)
- [docs/DECISIONS/ADR-0001-documentation-first.md](docs/DECISIONS/ADR-0001-documentation-first.md)

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

## Local MVP Runner

The repository now includes a small local PO/PM backlog runner for the first documented flow:

`brief -> PO/PM -> backlog draft`

Install dependencies for typechecking:

```bash
pnpm install
```

Run the sample brief:

```bash
pnpm backlog:run
```

The command reads [src/examples/sample-brief.md](src/examples/sample-brief.md) and writes a JSON draft plus a Markdown summary under `outputs/`.

You can also pass a custom brief path and optional output directory:

```bash
node --experimental-strip-types src/index.ts path/to/brief.md outputs
```

## Current Status

This repository now defines the product vision, agent roles, backlog model, workflow, and MVP scope for a semi-automatic first release.
