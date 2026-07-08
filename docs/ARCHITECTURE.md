# Architecture

## Architectural Stance

Start with explicit documents, stable contracts, and manual workflows. Add software only after the team agrees on the nouns, steps, and review points.

## Core Concepts

- `Project`: the delivery context
- `Brief`: the initial business or product request
- `BacklogItem`: the shared unit of work
- `AgentRun`: one role acting on structured input
- `Decision`: a human-approved clarification, rejection, or scope change

## V1 Logical Flow

```txt
Brief
-> PO/PM review
-> Backlog draft
-> UX/UI and Tech review
-> Front-end / Back-end breakdown
-> QA review
-> Approved delivery backlog
```

## V1 Source Of Truth

The source of truth is documentation plus simple structured files. Not a database, not a workflow tool, and not a chat transcript.

Recommended early persistence:

- Markdown for vision, rules, and playbooks
- JSON or YAML for sample backlog data
- Git history for change tracking

## Delivered Runtime Structure

The V1 runtime is a single local-first package (no web app, no database). The
code lives under `src/`, organized by concern:

```txt
src/
  cli.js            # `ade` command dispatcher (grouped + legacy commands)
  cli/              # shared CLI helpers (paths, logging, safe path, JSON)
  config/           # ade.config resolution, merge, validation
  context/          # deterministic project context + freshness
  contextpack/      # budgeted context packs, modes, cache, fragments
  blueprint/        # delivery blueprint selection + graph compilation
  engine/           # CLI-independent review engine + normalized findings
  harness/          # versioned agent execution requests/results + runner
  rules/            # technical rule packs (frontend/backend/development)
  agents/ prompts/ backlog/ export/ specialist/ review/ status/ github/
docs/               # documentation and decision records
examples/           # demo and reference fixtures
templates/          # reusable manual role templates
```

Future components (web/API apps, additional integrations) remain planned for
later milestones and are intentionally not part of V1.

## Boundaries

### Manual in V1

- creating or refining prompts
- reviewing agent outputs
- approving backlog changes
- deciding whether work is ready for implementation

### Automated later

- running prompts
- validating output schemas
- syncing backlog items to GitHub
- generating implementation prompts
- creating QA checklists
- running agent tasks through a Delivery Harness with isolated workspaces

## Recommended First Implementation Approach

1. Implement a local file-based runner, not a web app.
2. Support only one flow first: `brief -> PO/PM -> backlog draft`.
3. Define input and output contracts before plugging in any model.
4. Keep agent behavior deterministic where possible by using templates and checklists.
5. Introduce external APIs only after the manual version feels stable.
