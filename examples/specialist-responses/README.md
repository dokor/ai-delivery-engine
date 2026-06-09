# Specialist Response Examples

This directory contains local example specialist responses that follow [docs/contracts/SPECIALIST_RESPONSE_CONTRACT.md](../../docs/contracts/SPECIALIST_RESPONSE_CONTRACT.md).

These files are fixtures and documentation, not generated outputs.

## What These Examples Are

Each file shows what a good manual specialist response can look like after:

1. a backlog item is exported to Markdown
2. a specialist prompt is generated locally
3. that prompt is copied into an assistant manually
4. the assistant returns a Markdown response for human review

The examples are intentionally:

- local-first
- human-reviewable
- role-specific
- backlog-aware
- realistic but concise

## How They Relate To Generated Specialist Prompts

The repository can generate specialist prompts with:

- `pnpm prompt:specialist`
- `pnpm prompt:specialists`

Those prompts ask an assistant to produce a review-ready specialist response. The files in this directory show the expected style and structure of that response after the user copies the prompt into an assistant manually.

## How They Can Be Used Later

These fixtures can help with future work such as:

- validating whether specialist responses follow the contract
- building example-based local checks
- designing a future local importer or parser
- testing documentation and prompt quality

They are meant to be stable examples, not proof that any automated response flow exists yet.

## Current Fixtures

- [frontend-story-002.md](./frontend-story-002.md)
- [backend-task-005.md](./backend-task-005.md)
- [qa-task-010.md](./qa-task-010.md)

Each file references real backlog item IDs from [examples/demo-project/po-pm-response.json](../demo-project/po-pm-response.json).
