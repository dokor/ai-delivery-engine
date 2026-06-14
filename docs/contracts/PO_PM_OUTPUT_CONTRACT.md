# PO/PM Output Contract

## Purpose

This contract defines the importable JSON format that a manual AI response should follow after using the PO/PM prompt.

It is designed for the future manual loop:

`brief -> prompt:po -> manual AI response -> save locally -> import -> validate`

The contract is intentionally simple and aligned with the current `BacklogDraft` and `BacklogItem` types in [src/backlog/backlog.types.ts](../../src/backlog/backlog.types.ts).

## Format

The assistant should return one JSON object, ideally inside a fenced Markdown block:

```json
{
  "projectName": "string",
  "projectSummary": "string",
  "generatedAt": "ISO-8601 string",
  "sourceBrief": "string",
  "assumptions": ["string"],
  "questions": ["string"],
  "items": []
}
```

## Root-Level Fields

- `projectName`: required string
- `projectSummary`: required string
- `generatedAt`: required ISO-8601 timestamp string
- `sourceBrief`: required string path or identifier for the source brief
- `assumptions`: required string array
- `questions`: required string array for open questions
- `items`: required array of backlog items

## Backlog Item Fields

Required:

- `id`: string
- `type`: `epic` | `story` | `task` | `risk`
- `title`: string
- `description`: string
- `priority`: `low` | `medium` | `high`
- `status`: `draft` | `review` | `ready` | `done`

Optional:

- `parentId`: string
- `ownerRole`: `po_pm` | `ux_ui` | `frontend` | `backend` | `qa` | `tech_lead` | `legal_compliance` | `security` | `devops` | `data_analytics` | `customer_success`
- `acceptanceCriteria`: string array
- `assumptions`: string array
- `notes`: string array

## Representation Rules

- `assumptions` at the root describe broad project-level assumptions.
- `questions` at the root describe unresolved product or scope questions.
- `risk` items belong in `items` like any other backlog item.
- `story` items should usually include `acceptanceCriteria`.
- `task` items should usually reference a `parentId` pointing to a story.
- `story` items should usually reference a `parentId` pointing to an epic.

## What The Assistant Should Avoid Returning

- prose-only answers without JSON
- multiple competing output formats in one response
- implementation code
- GitHub issue formatting
- invented fields not covered by the contract unless explicitly needed later

## Sample Valid Output

See [src/examples/sample-po-pm-output.json](../../src/examples/sample-po-pm-output.json) for a valid example aligned with the current types.
