# Getting Started

## What AI Delivery Engine Does

AI Delivery Engine helps you turn a project brief into a reviewable local delivery backlog.

In practical terms, it gives you a repeatable V1 workflow to:

- start from a Markdown brief
- generate a deterministic backlog draft
- generate a manual PO/PM prompt for an external AI assistant
- import and validate the saved PO/PM response as local JSON
- review backlog quality
- export backlog items as Markdown files
- generate specialist prompts for all current V1 roles, including UX/UI, Front-end, Back-end, QA, Tech Lead, Legal & Compliance, Security, DevOps, Data & Analytics, and Customer Success

Everything in V1 is local-first. You run local commands, inspect local files, and decide manually what should happen next.

## Prerequisites

Before you start, make sure you have:

- Git
- Node.js installed locally
- `pnpm` installed locally

You also need a local clone of this repository.

## Install Dependencies

From the repository root:

```bash
pnpm install
```

The repository uses `pnpm` scripts from [package.json](../package.json).

## Fastest Way To Try It

If you want a plug-and-play first run, use the demo fixture in [examples/demo-project/README.md](../examples/demo-project/README.md).

If you specifically want a fixture that exercises every current V1 core role in one backlog, use [examples/demo-v1-roles/README.md](../examples/demo-v1-roles/README.md).

The main demo files are:

- `examples/demo-project/brief.md`
- `examples/demo-project/po-pm-response.json`

Generated demo outputs go under:

- `outputs/demo-project/`

## Run The Demo Workflow

Run the demo steps with explicit paths:

```bash
node --experimental-strip-types src/index.ts examples/demo-project/brief.md outputs/demo-project
node --experimental-strip-types src/promptPo.ts examples/demo-project/brief.md outputs/demo-project
node --experimental-strip-types src/importPo.ts examples/demo-project/po-pm-response.json outputs/demo-project
node --experimental-strip-types src/reviewBacklog.ts outputs/demo-project/po-pm-response.normalized.backlog.json outputs/demo-project
node --experimental-strip-types src/exportBacklog.ts outputs/demo-project/po-pm-response.normalized.backlog.json outputs/demo-project/exported-items
node --experimental-strip-types src/promptSpecialists.ts outputs/demo-project/exported-items/manifest.json outputs/demo-project/specialist-prompts
node --experimental-strip-types src/projectStatus.ts outputs/demo-project
```

This takes you from a demo brief to exported backlog items and specialist prompts without adding any external integration.

If you want to include specialist response checking in that flow, you can also run:

```bash
node --experimental-strip-types src/specialistCheck.ts examples/specialist-responses/frontend-story-002.md outputs/demo-project/specialist-check
```

This validates a saved Markdown specialist response locally and writes:

- `outputs/demo-project/specialist-check/frontend-story-002.specialist-check.md`
- `outputs/demo-project/specialist-check/frontend-story-002.specialist-check.json`

## Validate The Demo Workflow

To rerun and verify the built-in demo workflow end to end:

```bash
pnpm demo:validate
```

This command checks that the expected local files were generated for the demo flow.

## Inspect Generated Outputs

Use `outputs/` as your local working directory for generated artifacts.

Typical files to inspect:

- `outputs/*.backlog.json`
- `outputs/*.backlog.md`
- `outputs/*.po-pm.prompt.md`
- `outputs/*.normalized.backlog.json`
- `outputs/*.normalized.backlog.md`
- `outputs/backlog-review.md`
- `outputs/backlog-review.json`
- `outputs/exported-items/*.md`
- `outputs/exported-items/manifest.json`
- `outputs/specialist-prompts/*.prompt.md`
- `outputs/specialist-prompts/index.json`
- `outputs/specialist-prompts/README.md`
- `outputs/project-status.json`

The goal in V1 is to generate files, inspect them, and decide manually whether to continue or revise.

## Start From A Custom Project Brief

To use your own project, create a brief such as:

```txt
my-project/brief.md
```

Then generate a deterministic backlog draft:

```bash
node --experimental-strip-types src/index.ts my-project/brief.md outputs/my-project
```

This writes:

- `outputs/my-project/brief.backlog.json`
- `outputs/my-project/brief.backlog.md`

Use this step to get a local baseline before involving any external assistant manually.

## Generate PO/PM Prompts

Generate a manual PO/PM prompt from your brief:

```bash
node --experimental-strip-types src/promptPo.ts my-project/brief.md outputs/my-project
```

Or use the repository default sample brief:

```bash
pnpm prompt:po
```

This writes a Markdown prompt file such as:

- `outputs/my-project/brief.po-pm.prompt.md`

Copy that prompt into ChatGPT, Codex, Claude, or another assistant manually.

## Save And Import PO/PM Responses

After you use the generated PO/PM prompt in an assistant:

1. save the response locally as JSON
2. make sure it follows [contracts/PO_PM_OUTPUT_CONTRACT.md](./contracts/PO_PM_OUTPUT_CONTRACT.md)

For example:

```txt
my-project/po-pm-response.json
```

Import and validate it:

```bash
node --experimental-strip-types src/importPo.ts my-project/po-pm-response.json outputs/my-project
```

This writes normalized backlog files such as:

- `outputs/my-project/po-pm-response.normalized.backlog.json`
- `outputs/my-project/po-pm-response.normalized.backlog.md`

If validation fails, fix the source JSON and run the importer again.

## Review Backlog Quality

Run the deterministic backlog review against the normalized backlog:

```bash
node --experimental-strip-types src/reviewBacklog.ts outputs/my-project/po-pm-response.normalized.backlog.json outputs/my-project
```

Or use the repository sample default:

```bash
pnpm backlog:review
```

This writes:

- `outputs/my-project/backlog-review.md`
- `outputs/my-project/backlog-review.json`

Review the findings before moving on.

## Export Backlog Items

Export the normalized backlog into one Markdown file per item:

```bash
node --experimental-strip-types src/exportBacklog.ts outputs/my-project/po-pm-response.normalized.backlog.json outputs/my-project/exported-items
```

This writes:

- `outputs/my-project/exported-items/*.md`
- `outputs/my-project/exported-items/manifest.json`

Use the exported Markdown files for manual review, specialist prompting, and future implementation planning.

## Generate Specialist Prompts

You have two local options.

Generate a single specialist prompt from one exported backlog item:

```bash
node --experimental-strip-types src/promptSpecialist.ts frontend outputs/my-project/exported-items/story-002.md outputs/my-project
```

Generate a batch of specialist prompts from the export manifest:

```bash
pnpm prompt:specialists
```

Or with explicit custom paths:

```bash
node --experimental-strip-types src/promptSpecialists.ts outputs/my-project/exported-items/manifest.json outputs/my-project/specialist-prompts
```

When you use one of the generated specialist prompts in an assistant, the response should follow [contracts/SPECIALIST_RESPONSE_CONTRACT.md](./contracts/SPECIALIST_RESPONSE_CONTRACT.md) so it stays local-first and easy to review manually.

For fixture examples of what those responses can look like, see [../examples/specialist-responses/README.md](../examples/specialist-responses/README.md).

Supported batch role mappings:

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
seo -> seo
```

The current specialist prompt commands support all current V1 roles from [templates/](../templates/). V2-only roles such as Performance, Accessibility, Finance & Cost, and Marketing are still intentionally excluded.

Items with missing or unsupported owner roles are skipped intentionally.

## Inspect Specialist Prompt Indexes

When you run the batch specialist prompt command, it generates:

- `outputs/my-project/specialist-prompts/index.json`
- `outputs/my-project/specialist-prompts/README.md`

These files help you inspect the generated prompt batch quickly.

`index.json` includes:

- source manifest path
- generation timestamp
- manifest item count
- generated prompt count
- skipped item count
- one entry per generated prompt

The generated `README.md` gives you a human-readable summary and links to the prompt files in that batch.

## Check A Specialist Response

If you save or keep a specialist response as Markdown, you can run the local checker against it:

```bash
pnpm specialist:check
```

Practical flow:

```txt
specialist prompt -> manual response -> specialist:check -> human review
```

The response is still generated manually and saved locally. The checker only validates structure and suspicious claims against the documented contract. It does not grade specialist quality semantically, approve work automatically, or decide whether the response is good enough to use.

Or with an explicit file path:

```bash
node --experimental-strip-types src/specialistCheck.ts examples/specialist-responses/frontend-story-002.md outputs
```

This writes a Markdown report and a JSON report under `outputs/` so you can review missing sections, unsupported roles, weak content, or suspicious claims before using the response further.

Typical outputs:

- `outputs/frontend-story-002.specialist-check.md`
- `outputs/frontend-story-002.specialist-check.json`

Human review still decides whether the response should be accepted, revised, or rejected after the checker runs.

## How To Use Generated Files Manually

In V1, generated files are working artifacts for human-controlled delivery.

Typical manual use:

1. read the deterministic backlog draft and decide whether it is a useful baseline
2. copy the PO/PM prompt into an assistant manually
3. save the assistant response as JSON and import it locally
4. inspect backlog review findings
5. read exported backlog item Markdown files one by one
6. generate specialist prompts for the items you want to refine further
7. copy specialist prompts into an assistant manually when needed
8. save specialist responses as Markdown and run `specialist:check` when you want a local structural check
9. decide which backlog items are ready for implementation

Nothing in V1 marks items ready automatically.

## What Remains Intentionally Manual In V1

The following steps stay manual on purpose:

- choosing or writing the brief
- deciding whether the deterministic draft is good enough
- choosing which external assistant to use
- copying prompts into that assistant
- saving AI responses locally
- deciding which specialist responses need revision after `specialist:check`
- deciding whether validation errors need prompt changes or JSON fixes
- deciding whether backlog review findings are acceptable
- deciding which exported items should move toward implementation

This keeps the workflow aligned with [MANUAL_WORKFLOW.md](./MANUAL_WORKFLOW.md) and the current local-first MVP scope.

## Keeping This Guide Up To Date

Update this document whenever one of these changes:

- a command name changes in [package.json](../package.json)
- the recommended workflow order changes
- a new generated artifact becomes part of the normal local flow
- the demo workflow in [examples/demo-project/README.md](../examples/demo-project/README.md) changes
- the manual operating model in [MANUAL_WORKFLOW.md](./MANUAL_WORKFLOW.md) changes

When updating it, prefer:

- concrete commands over abstract descriptions
- explicit input and output paths
- practical notes about what a user should inspect next
- alignment with the local-only, human-controlled V1 workflow

For the final maintainer gate before declaring the local-first workflow complete, use [V1_READINESS_CHECKLIST.md](./V1_READINESS_CHECKLIST.md).

For the role-to-role context flow behind that workflow, use [V1_ROLE_HANDOFFS.md](./V1_ROLE_HANDOFFS.md).
