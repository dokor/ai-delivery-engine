# V1 Human Approval Gates

V1 is intentionally human-controlled. The engine can prepare outputs and run individual
steps, but a human must approve, reject, revise, or continue at every important transition.
This document makes those gates explicit so it is clear where a human decision is required
before the workflow moves forward.

It complements the role handoff map in [V1_ROLE_HANDOFFS.md](./V1_ROLE_HANDOFFS.md) (which
describes context flow between roles) and the [WORKFLOW.md](./WORKFLOW.md) overview. Where
handoffs describe *what context moves between roles*, this document describes *where a human
must decide before the next step runs*.

## How to read this document

Each gate follows the same structure:

- **Reviewed artifact** — the file or output a human inspects at this gate.
- **Reviewer** — who makes the decision (a human in V1; a role perspective may inform it).
- **Possible decisions** — the choices available at the gate.
- **What happens next** — the step unlocked when the gate is approved.
- **Must not be automated in V1** — the part that stays a human decision.

All gates share one rule: **no gate advances on its own.** A command may generate an output,
but a human reads it and explicitly moves the workflow forward.

## Gate summary

| # | Gate | Reviewed artifact | Unlocks |
|---|------|-------------------|---------|
| 1 | Brief accepted for processing | project brief `.md` | `pnpm backlog:run` |
| 2 | Deterministic backlog draft reviewed | `outputs/*.backlog.json` / `.md` | `pnpm prompt:po` |
| 3 | PO/PM prompt copied manually | `outputs/*.po-pm.prompt.md` | manual assistant run |
| 4 | PO/PM response saved locally | saved PO/PM JSON | `pnpm import:po` |
| 5 | Imported backlog accepted | `outputs/*.normalized.backlog.*` | `pnpm backlog:review` |
| 6 | Backlog quality review accepted | backlog review report | `pnpm backlog:export` |
| 7 | Exported items approved for specialist review | `outputs/exported-items/*` | `pnpm prompt:specialist(s)` |
| 8 | Specialist prompts selected | `outputs/specialist-prompts/*` | manual assistant run |
| 9 | Specialist responses saved locally | saved specialist `.md` | `pnpm specialist:check` |
| 10 | Specialist response checks reviewed | `*.specialist-check.md` / `.json` | backlog refinement |
| 11 | Implementation issues / Codex prompts approved | GitHub issue / implementation prompt | development |
| 12 | Release readiness approved | [V1_READINESS_CHECKLIST.md](./V1_READINESS_CHECKLIST.md) | release |

---

## Gate 1 — Brief accepted for processing

- **Reviewed artifact:** the project brief Markdown file (e.g. `src/examples/sample-brief.md`
  or a custom `brief.md`).
- **Reviewer:** the human who owns the project intent.
- **Possible decisions:** accept the brief as-is, edit it for clarity, or reject and rewrite
  it before any backlog generation.
- **What happens next:** the brief is passed to `pnpm backlog:run`.
- **Must not be automated in V1:** deciding that a brief is complete and correct enough to
  process.

## Gate 2 — Deterministic backlog draft reviewed

- **Reviewed artifact:** `outputs/<brief>.backlog.json` and `outputs/<brief>.backlog.md` from
  `pnpm backlog:run`.
- **Reviewer:** a human acting from the PO/PM perspective.
- **Possible decisions:** accept the draft, revise the brief and regenerate, or reject the
  structure.
- **What happens next:** generate the manual PO/PM prompt with `pnpm prompt:po`.
- **Must not be automated in V1:** treating the deterministic draft as the accepted backlog
  without human review.

## Gate 3 — PO/PM prompt copied manually

- **Reviewed artifact:** `outputs/<brief>.po-pm.prompt.md` from `pnpm prompt:po`.
- **Reviewer:** the human operating the assistant.
- **Possible decisions:** copy the prompt into an assistant as-is, adjust it before sending,
  or decide the prompt is not ready.
- **What happens next:** the human runs the prompt in the assistant of their choice and
  captures the JSON response.
- **Must not be automated in V1:** calling a model provider directly from ADE — the assistant
  step is manual and provider-agnostic.

## Gate 4 — PO/PM response saved locally

- **Reviewed artifact:** the assistant's JSON response saved to a local file (aligned with
  [contracts/PO_PM_OUTPUT_CONTRACT.md](./contracts/PO_PM_OUTPUT_CONTRACT.md)).
- **Reviewer:** the human who received the assistant output.
- **Possible decisions:** save the response for import, request a revised response, or discard
  it.
- **What happens next:** import with `pnpm import:po`.
- **Must not be automated in V1:** accepting an assistant response without a human confirming
  it is the intended one.

## Gate 5 — Imported backlog accepted

- **Reviewed artifact:** `outputs/*.normalized.backlog.json` and `.md` from `pnpm import:po`
  (after contract and type validation).
- **Reviewer:** a human acting from the PO/PM perspective.
- **Possible decisions:** accept the normalized backlog, fix the source response and re-import,
  or reject.
- **What happens next:** run backlog quality checks with `pnpm backlog:review`.
- **Must not be automated in V1:** promoting the imported backlog to "the backlog" without
  human acceptance.

## Gate 6 — Backlog quality review accepted

- **Reviewed artifact:** the deterministic review report from `pnpm backlog:review` (missing
  acceptance criteria, orphan items, weak descriptions, missing risks, etc.).
- **Reviewer:** a human, optionally informed by the Tech Lead and QA perspectives.
- **Possible decisions:** accept the backlog quality, revise items and re-review, or block on
  quality issues.
- **What happens next:** export items for specialist review with `pnpm backlog:export`.
- **Must not be automated in V1:** deciding the backlog is quality-approved — the checker
  reports findings but does not approve.

## Gate 7 — Exported backlog items approved for specialist review

- **Reviewed artifact:** `outputs/exported-items/*.md` and `outputs/exported-items/manifest.json`
  from `pnpm backlog:export`.
- **Reviewer:** a human coordinating specialist review.
- **Possible decisions:** approve the exported set for specialist review, adjust which items
  are in scope, or defer some items.
- **What happens next:** generate specialist prompts with `pnpm prompt:specialists` (batch) or
  `pnpm prompt:specialist <role> <item.md>` (single).
- **Must not be automated in V1:** deciding which items warrant specialist review.

## Gate 8 — Specialist prompts selected

- **Reviewed artifact:** `outputs/specialist-prompts/*.prompt.md` plus the generated
  `index.json` and `README.md`.
- **Reviewer:** the human operating the assistant.
- **Possible decisions:** select which specialist prompts to run, adjust prompts, or skip
  roles that do not apply.
- **What happens next:** the human runs the selected prompts in an assistant and saves the
  responses.
- **Must not be automated in V1:** automatically running every specialist prompt or calling a
  model provider from ADE.

## Gate 9 — Specialist responses saved locally

- **Reviewed artifact:** each specialist response saved as Markdown (aligned with
  [contracts/SPECIALIST_RESPONSE_CONTRACT.md](./contracts/SPECIALIST_RESPONSE_CONTRACT.md)).
- **Reviewer:** the human who received the specialist output.
- **Possible decisions:** save the response for checking, request a revision, or discard it.
- **What happens next:** validate with `pnpm specialist:check <response.md>`.
- **Must not be automated in V1:** treating a specialist response as accepted before it is
  checked and reviewed.

## Gate 10 — Specialist response checks reviewed

- **Reviewed artifact:** `outputs/*.specialist-check.md` and `.json` from `pnpm specialist:check`.
- **Reviewer:** a human deciding whether the response is accepted, revised, or rejected.
- **Possible decisions:** accept the specialist response, request a revision, or reject it.
  The checker is structure-focused and never approves quality on its own.
- **What happens next:** accepted recommendations are folded into backlog refinement as
  human-reviewed updates.
- **Must not be automated in V1:** grading specialist quality semantically or auto-accepting a
  response.

## Gate 11 — Implementation issues / Codex prompts approved

- **Reviewed artifact:** the GitHub issue (enriched via the issue workflow) or the
  implementation prompt prepared for an assistant.
- **Reviewer:** a human, informed by the Tech Lead perspective.
- **Possible decisions:** approve the issue/prompt for development, refine it, or hold it for
  more information.
- **What happens next:** development proceeds on a branch; see
  [GITHUB_WORKFLOW.md](./GITHUB_WORKFLOW.md).
- **Must not be automated in V1:** creating remote issues or starting development without human
  approval, and merging pull requests automatically.

## Gate 12 — Release readiness approved

- **Reviewed artifact:** [V1_READINESS_CHECKLIST.md](./V1_READINESS_CHECKLIST.md) and the
  supporting QA, DevOps, and Customer Success notes.
- **Reviewer:** a human making the release call.
- **Possible decisions:** approve release, defer pending fixes, or block on readiness gaps.
- **What happens next:** release proceeds through the documented release process.
- **Must not be automated in V1:** declaring release readiness or triggering a release without
  explicit human approval.

---

## General rules

- Every gate is human-approved in V1. Commands prepare artifacts; humans decide.
- No gate triggers the next step automatically. Automation is only introduced after the manual
  flow is trusted, measurable, and easy to audit (see [WORKFLOW.md](./WORKFLOW.md)).
- ADE does not call model providers, create remote issues, or merge pull requests on its own in
  V1. Those remain manual, human-controlled actions.
