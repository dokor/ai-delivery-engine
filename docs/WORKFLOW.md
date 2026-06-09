# Workflow

## Core Delivery Flow

```txt
Brief
-> PO/PM creates backlog draft
-> Human review
-> UX/UI enriches selected items
-> Front-end and Back-end split implementation work
-> QA adds validation steps
-> Human approves delivery-ready backlog
```

## How Agents Interact With The Backlog

The backlog is the handoff surface between roles.

- PO/PM creates and prioritizes items
- UX/UI clarifies experience and content impact
- Front-end and Back-end expand stories into implementation tasks
- QA adds acceptance coverage and test notes
- Tech Lead optionally challenges sequence, risk, and architecture

Agents should update or comment on existing backlog items rather than creating disconnected outputs.

## V1 Manual Steps

- writing the brief
- choosing which agent runs next
- reviewing output quality
- accepting, editing, or rejecting backlog changes
- deciding what is ready to move forward

## Semi-Automatic Mode

Semi-automatic mode means the engine can prepare outputs or run agent steps, but a human still approves major transitions such as:

- brief to backlog
- backlog to GitHub issues
- story to implementation prompt
- ready for development

## Fully Automatic Mode

Fully automatic mode means the engine can trigger the next role on its own, apply policy rules, and create delivery artifacts with minimal human intervention. This is a later goal, not a V1 target.

## Workflow Rule

Automation should only be introduced after the manual flow is trusted, measurable, and easy to audit.
