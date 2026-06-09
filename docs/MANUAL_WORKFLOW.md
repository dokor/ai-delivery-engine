# Manual Workflow

## Purpose

This document explains the V1 semi-automatic workflow from project brief to reviewed backlog.

It stays aligned with:

- [MVP.md](./MVP.md)
- [WORKFLOW.md](./WORKFLOW.md)
- [contracts/PO_PM_OUTPUT_CONTRACT.md](./contracts/PO_PM_OUTPUT_CONTRACT.md)

V1 is intentionally human-controlled. Local commands prepare or validate artifacts, but a human still decides what is good enough to move forward.

## Workflow Overview

1. Write or choose a project brief.
2. Generate a deterministic backlog draft.
3. Generate a PO/PM manual prompt.
4. Copy the prompt into an AI assistant.
5. Save the AI response locally.
6. Import and validate the response.
7. Review backlog quality.
8. Export backlog items.
9. Decide what is ready for implementation.

## Inputs And Outputs

Typical input files:

- `src/examples/sample-brief.md`
- `src/examples/sample-po-pm-output.json`

Typical generated files under `outputs/`:

- `sample-brief.backlog.json`
- `sample-brief.backlog.md`
- `sample-brief.po-pm.prompt.md`
- `sample-po-pm-output.normalized.backlog.json`
- `sample-po-pm-output.normalized.backlog.md`
- `backlog-review.md`
- `backlog-review.json`
- `exported-items/*.md`

`outputs/` is the working directory for local generated artifacts. It is where you inspect deterministic drafts, copyable prompts, imported backlog files, review reports, and exported Markdown items before any future remote synchronization exists.

## Step By Step

### 1. Write Or Choose A Project Brief

Human-controlled:

- choose an existing brief or write a new one
- decide whether the brief is detailed enough to proceed

Typical input:

- `src/examples/sample-brief.md`

Goal:

- start from a simple Markdown brief with summary, goals, audience, pages, constraints, and success criteria when possible

### 2. Generate A Deterministic Backlog Draft

Command:

```bash
pnpm backlog:run
```

Human-controlled:

- decide whether to use the deterministic draft as a baseline
- inspect whether the generated scope looks useful before involving manual AI help

Input:

- brief Markdown file

Outputs:

- `outputs/sample-brief.backlog.json`
- `outputs/sample-brief.backlog.md`

Purpose:

- create a small local baseline without calling any model or external service

### 3. Generate A PO/PM Manual Prompt

Command:

```bash
pnpm prompt:po
```

Human-controlled:

- decide whether the brief is ready to send to an assistant
- review the generated prompt before copy/paste

Input:

- brief Markdown file

Output:

- `outputs/sample-brief.po-pm.prompt.md`

Purpose:

- create a provider-agnostic prompt that asks for a structured JSON response aligned with the PO/PM output contract

### 4. Copy The Prompt Into An AI Assistant

Human-controlled:

- choose the assistant manually
- paste the generated prompt
- decide whether to regenerate or refine the answer

No local command runs here.

Purpose:

- get a manual AI response without adding API integrations

### 5. Save The AI Response Locally

Human-controlled:

- save the assistant response as a local JSON file
- make sure the response follows [contracts/PO_PM_OUTPUT_CONTRACT.md](./contracts/PO_PM_OUTPUT_CONTRACT.md)

Typical file:

- `src/examples/sample-po-pm-output.json`

Purpose:

- convert a manual assistant response into a local artifact that can be imported and validated

### 6. Import And Validate The Response

Command:

```bash
pnpm import:po
```

Human-controlled:

- decide whether the saved AI response is worth importing
- inspect validation failures and correct the source response if needed

Input:

- local PO/PM JSON response

Outputs:

- `outputs/sample-po-pm-output.normalized.backlog.json`
- `outputs/sample-po-pm-output.normalized.backlog.md`

Purpose:

- validate contract shape locally
- normalize the response into backlog draft outputs

### 7. Review Backlog Quality

Command:

```bash
pnpm backlog:review
```

Human-controlled:

- decide whether the review findings are acceptable
- choose whether to send the backlog back through another PO/PM pass

Input:

- local backlog JSON file

Outputs:

- `outputs/backlog-review.md`
- `outputs/backlog-review.json`

Purpose:

- run deterministic, explainable checks for missing acceptance criteria, missing owner roles, orphan links, weak descriptions, missing assumptions or open questions, and missing risks

### 8. Export Backlog Items

Command:

```bash
pnpm backlog:export
```

Human-controlled:

- inspect the exported Markdown items one by one
- decide which items are understandable enough for downstream use

Input:

- local backlog JSON file

Outputs:

- `outputs/exported-items/*.md`

Purpose:

- turn backlog items into reviewable local Markdown files before any remote issue creation exists

### 9. Decide What Is Ready For Implementation

Human-controlled:

- review deterministic backlog output
- review the imported AI-assisted backlog
- review quality findings
- review exported item files
- decide which stories or tasks are ready for the next implementation-oriented workflow

No local command makes this decision automatically in V1.

## What Is Human-Controlled

The following remain human-controlled in V1:

- writing or choosing the brief
- deciding whether to use the deterministic draft
- deciding when to involve an external assistant manually
- saving the AI response locally
- interpreting validation failures
- deciding whether the backlog quality is good enough
- deciding what is ready for implementation

This matches [MVP.md](./MVP.md), which explicitly keeps prompts, AI tool execution, output review, backlog edits, and readiness decisions manual in V1.

## What Should Not Be Automated Yet

Do not automate these yet:

- remote AI calls
- GitHub issue creation
- automatic implementation prompts from unreviewed backlog items
- automatic promotion of backlog items to ready status
- end-to-end autonomous project delivery

This stays aligned with [WORKFLOW.md](./WORKFLOW.md), where semi-automatic mode still requires human approval at major transitions.

## Recommended V1 Habit

Treat each command as a checkpoint:

1. generate or import an artifact
2. inspect it locally in `outputs/`
3. decide whether to continue or revise

That is the intended semi-automatic delivery loop for V1.
