# Manual Workflow

## Purpose

This document explains the complete V1 local workflow from project brief to reviewed and exportable backlog items.

It stays aligned with:

- [MVP.md](./MVP.md)
- [WORKFLOW.md](./WORKFLOW.md)
- [contracts/PO_PM_OUTPUT_CONTRACT.md](./contracts/PO_PM_OUTPUT_CONTRACT.md)

V1 is intentionally human-controlled. Local commands prepare or validate artifacts, but a human still decides what is good enough to move forward.

## Workflow Overview

1. Start from a project brief.
2. Generate a deterministic backlog draft.
3. Generate a PO/PM manual prompt.
4. Copy the prompt into an AI assistant manually.
5. Save the AI response locally.
6. Import and validate the response.
7. Run the backlog quality review.
8. Export backlog items to Markdown.
9. Use the export manifest and generate specialist prompts when needed.
10. Save specialist responses locally as Markdown.
11. Run the specialist response checker.
12. Close a demo delivery run into a delivery dossier when repository, production and validation evidence are available.
13. Decide what is ready for implementation.

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
- `exported-items/manifest.json`
- `specialist-prompts/*.prompt.md`
- `frontend-story-002.specialist-check.md`
- `frontend-story-002.specialist-check.json`
- `delivery/sample-delivery-run.delivery-closure.json`
- `delivery/sample-delivery-run.delivery-closure.md`
- `delivery/sample-delivery-run.delivery-closure.notification.md`

`outputs/` is the local working directory for generated artifacts. Use it as the inspection area for deterministic drafts, copyable prompts, imported backlog files, review reports, exported Markdown items, and the export manifest before any future synchronization or deeper automation exists.

The delivery closure command reads a structured run summary and writes final delivery evidence under `outputs/delivery/` by default:

```bash
pnpm delivery:close
```

It produces a JSON result, an operations dossier and a final notification. `completed` requires repository, version, production and validation evidence, unless an explicit approved exception is present. Sensitive artifacts, evidence and variable values are excluded or masked in generated Markdown.

## Specialist Loop Summary

Once backlog items are exported (step 8), each item can go through a small, fully manual specialist loop before any implementation decision is made:

```txt
exported backlog item
-> specialist prompt
-> manual specialist response
-> local response check
-> human decision
```

At a glance:

| Stage | What happens | Command | Input | Output |
|---|---|---|---|---|
| Exported backlog item | An exported Markdown item is the starting point | `pnpm backlog:export` (step 8) | backlog JSON | `outputs/exported-items/*.md` + `outputs/exported-items/manifest.json` |
| Specialist prompt | Generate a provider-agnostic prompt for one item or in batch | `pnpm prompt:specialist <role> <item.md> [outputDir]` or `pnpm prompt:specialists` | exported item(s) / manifest | single: `outputs/<item-id>.<role>.prompt.md` · batch: `outputs/specialist-prompts/*.prompt.md` + `index.json` + `README.md` |
| Manual specialist response | A human copies the prompt into an AI assistant and saves the answer as Markdown | none (manual) | generated prompt | a local `.md` file, e.g. under `examples/specialist-responses/` |
| Local response check | Deterministic structural check against the specialist response contract | `pnpm specialist:check <response.md> [outputDir]` | saved response `.md` | `outputs/<name>.specialist-check.md` + `.json` |
| Human decision | A human accepts, revises, or rejects the response | none (manual) | check report + response | decision recorded outside the tool |

Where things live:

- **Generated prompts** — single-item prompts are written to `outputs/` by default; batch prompts to `outputs/specialist-prompts/` (with an `index.json` and a browsable `README.md`).
- **Saved specialist responses** — kept as local Markdown. The repository ships example fixtures under [`examples/specialist-responses/`](../examples/specialist-responses/README.md); your own responses can live there or at any local path you pass to the checker.
- **Check reports** — always written under `outputs/` as `<name>.specialist-check.md` and `<name>.specialist-check.json`.

Supported specialist roles: `ux-ui`, `frontend`, `backend`, `qa`, `tech-lead`, `legal-compliance`, `security`, `devops`, `data-analytics`, `customer-success`, `seo`.

What stays intentionally manual in V1:

- choosing which exported items deserve a specialist pass;
- copying a prompt into an assistant and saving its response (no API call, no model call from ADE);
- reading the check report and deciding whether to accept, revise, or reject the response;
- deciding what is ready for implementation.

The checker is deterministic and structure-focused: it never grades quality semantically, never approves work, and never promotes an item. The human decision gate is always the last step. Each stage is detailed in [Step By Step](#step-by-step) below (steps 8 to 12).

## Step By Step

### 1. Start From A Project Brief

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

Reads:

- brief Markdown file such as `src/examples/sample-brief.md`

Writes:

- `outputs/sample-brief.backlog.json`
- `outputs/sample-brief.backlog.md`

Human review:

- inspect whether the generated scope looks useful
- decide whether to use the deterministic draft as the baseline before involving manual AI help

Purpose:

- create a small local baseline without calling any external model or service

### 3. Generate A PO/PM Manual Prompt

Command:

```bash
pnpm prompt:po
```

Reads:

- brief Markdown file such as `src/examples/sample-brief.md`

Writes:

- `outputs/sample-brief.po-pm.prompt.md`

Human review:

- review the generated prompt before copy and paste
- decide whether the brief and prompt are ready to send to an assistant

Purpose:

- create a provider-agnostic prompt that asks for a structured JSON response aligned with the PO/PM output contract

### 4. Copy The Prompt Into An AI Assistant Manually

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

Reads:

- local PO/PM JSON response such as `src/examples/sample-po-pm-output.json`

Writes:

- `outputs/sample-po-pm-output.normalized.backlog.json`
- `outputs/sample-po-pm-output.normalized.backlog.md`

Human review:

- inspect validation failures and correct the source response if needed
- decide whether the imported backlog is good enough to move into review

Purpose:

- validate contract shape locally
- normalize the response into backlog draft outputs

### 7. Run The Backlog Quality Review

Command:

```bash
pnpm backlog:review
```

Reads:

- local backlog JSON file, typically the imported normalized backlog

Writes:

- `outputs/backlog-review.md`
- `outputs/backlog-review.json`

Human review:

- inspect the findings and decide whether the backlog needs another PO/PM revision
- decide whether the current backlog quality is acceptable for export

Purpose:

- run deterministic, explainable checks for missing acceptance criteria, missing owner roles, orphan links, weak descriptions, missing assumptions or open questions, and missing risks

### 8. Export Backlog Items To Markdown

Command:

```bash
pnpm backlog:export
```

Reads:

- local backlog JSON file, typically the imported normalized backlog

Writes:

- `outputs/exported-items/*.md`
- `outputs/exported-items/manifest.json`

Human review:

- inspect the exported item files one by one
- decide whether the exported backlog items are understandable enough for downstream implementation work

Purpose:

- turn backlog items into reviewable local Markdown files
- create a manifest that summarizes the export in one machine-readable place before any remote issue creation exists

### 9. Use The Export Manifest

Primary file:

- `outputs/exported-items/manifest.json`

What it contains:

- source backlog path
- export timestamp
- exported item count
- one entry per exported Markdown file with item metadata and suggested labels

How to use it later:

- confirm which items were exported in one pass
- trace each Markdown file back to its backlog item metadata
- prepare future local sync or issue-creation tooling without using it yet in V1
- compare later exports to earlier ones during human review

Human review:

- inspect whether the manifest matches the exported item files
- decide whether the export set is complete enough for the next implementation-oriented step

### 10. Save Specialist Responses Locally

Human-controlled:

- choose which exported backlog items need specialist review
- copy a generated specialist prompt into an assistant manually
- save the specialist response as a local Markdown file

Typical source files:

- exported backlog item Markdown from `outputs/exported-items/`
- generated specialist prompts from `outputs/specialist-prompts/`
- example response fixtures from [../examples/specialist-responses/README.md](../examples/specialist-responses/README.md)

Purpose:

- keep specialist review local, manual, and provider agnostic
- create a reviewable Markdown artifact before any acceptance decision is made

### 11. Run The Specialist Response Checker

Command:

```bash
pnpm specialist:check
```

Reads:

- a local specialist response Markdown file such as `examples/specialist-responses/frontend-story-002.md`

Writes:

- `outputs/frontend-story-002.specialist-check.md`
- `outputs/frontend-story-002.specialist-check.json`

Human review:

- inspect missing sections, unsupported roles, weak content, or suspicious claims
- decide whether the response should be accepted, revised, or rejected

Purpose:

- run a deterministic structural check against the specialist response contract
- surface obvious format and workflow problems before the response is used further

Boundary:

- the checker does not grade specialist quality semantically
- the checker does not approve work automatically
- the checker does not decide whether the response is good enough to keep

### 12. Decide What Is Ready For Implementation

Human-controlled:

- review deterministic backlog output
- review the imported AI-assisted backlog
- review quality findings
- review exported item files
- review the export manifest
- review specialist responses and their checker outputs when used
- decide which stories or tasks are ready for the next implementation-oriented workflow

No local command makes this decision automatically in V1.

## What Is Human-Controlled

The following remain human-controlled in V1:

- writing or choosing the brief
- deciding whether to use the deterministic draft
- deciding when to involve an external assistant manually
- saving the AI response locally
- saving specialist responses locally
- interpreting validation failures
- deciding whether the backlog quality is good enough
- checking the exported Markdown items and manifest
- deciding whether a specialist response should be accepted, revised, or rejected
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
