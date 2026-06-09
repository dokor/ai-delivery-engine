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

- [docs/VISION.md](/C:/Users/antoi/IdeaProjects/ai-delivery-engine/docs/VISION.md)
- [docs/ROADMAP.md](/C:/Users/antoi/IdeaProjects/ai-delivery-engine/docs/ROADMAP.md)
- [docs/ARCHITECTURE.md](/C:/Users/antoi/IdeaProjects/ai-delivery-engine/docs/ARCHITECTURE.md)
- [docs/AGENTS.md](/C:/Users/antoi/IdeaProjects/ai-delivery-engine/docs/AGENTS.md)
- [docs/WORKFLOW.md](/C:/Users/antoi/IdeaProjects/ai-delivery-engine/docs/WORKFLOW.md)
- [docs/BACKLOG_MODEL.md](/C:/Users/antoi/IdeaProjects/ai-delivery-engine/docs/BACKLOG_MODEL.md)
- [docs/MVP.md](/C:/Users/antoi/IdeaProjects/ai-delivery-engine/docs/MVP.md)
- [docs/DECISIONS/ADR-0001-documentation-first.md](/C:/Users/antoi/IdeaProjects/ai-delivery-engine/docs/DECISIONS/ADR-0001-documentation-first.md)

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

## Current Status

This repository now defines the product vision, agent roles, backlog model, workflow, and MVP scope for a semi-automatic first release.
