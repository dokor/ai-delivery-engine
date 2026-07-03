# Agents

AI Delivery Engine uses roles as delivery perspectives, not as autonomous workers. Each role receives structured context, produces bounded recommendations, and hands decisions back to a human reviewer.

## Shared Rules

- every role works from the backlog, brief, and current delivery context
- every important handoff stays human-reviewed in V1
- roles can add assumptions, open questions, risks, and suggested backlog updates
- outputs should stay local-first, provider agnostic, and easy to review manually

# V1 Core Roles

## PO/PM (`po-pm`)

- Mission: turn a brief into a reviewable product backlog with scope, priorities, and acceptance criteria.
- Primary outputs: backlog draft, assumptions, open questions, story framing.
- When the role participates: first, and again whenever scope or backlog structure needs revision.
- Key interactions: hands work to UX/UI, Legal & Compliance, Data & Analytics, and Tech Lead; receives review feedback from all downstream roles.

## UX/UI (`ux-ui`)

- Mission: make the user journey, content structure, and interface expectations clear before implementation planning deepens.
- Primary outputs: UX notes, flow clarifications, content gaps, accessibility concerns, suggested UX tasks.
- When the role participates: after PO/PM framing and before detailed implementation breakdown.
- Key interactions: works closely with PO/PM, Frontend, QA, and Customer Success.

## Frontend (`frontend`)

- Mission: translate approved stories into UI implementation planning with component, state, and integration concerns made explicit.
- Primary outputs: front-end task suggestions, view or component breakdown notes, state handling notes, delivery risks.
- When the role participates: after story scope and UX direction are clear enough for implementation planning.
- Key interactions: depends on PO/PM, UX/UI, Backend, Security, DevOps, and QA.

## Backend (`backend`)

- Mission: translate approved stories into API, service, and data planning that fits the MVP scope.
- Primary outputs: back-end task suggestions, data notes, service behavior notes, technical constraints.
- When the role participates: after story scope is stable enough to define request, storage, and workflow behavior.
- Key interactions: works with PO/PM, Frontend, Security, DevOps, Data & Analytics, and QA.

## QA (`qa`)

- Mission: define how the planned work will be checked before implementation is treated as ready.
- Primary outputs: test checklists, acceptance coverage notes, regression risks, quality blockers.
- When the role participates: after implementation planning exists and before release readiness decisions.
- Key interactions: reviews outputs from UX/UI, Frontend, Backend, Security, and Customer Success.

## Tech Lead (`tech-lead`)

- Mission: challenge sequencing, architecture fit, scope tradeoffs, and technical risk across the plan.
- Primary outputs: technical review notes, dependency warnings, sequencing adjustments, scope risk calls.
- When the role participates: after core story shaping and before major implementation or release readiness decisions.
- Key interactions: reviews PO/PM, Frontend, Backend, Security, DevOps, and QA perspectives.

## Legal & Compliance (`legal-compliance`)

- Mission: surface policy, privacy, consent, and compliance concerns early enough to shape safe MVP decisions.
- Primary outputs: compliance notes, policy questions, consent or data-handling risks, suggested constraints.
- When the role participates: after the main user flow is clear and before implementation assumptions harden.
- Key interactions: works with PO/PM, UX/UI, Backend, Security, and Customer Success.

## Security (`security`)

- Mission: identify obvious security risks, trust boundaries, and handling concerns before delivery work is treated as ready.
- Primary outputs: security review notes, threat or misuse concerns, sensitive-data handling warnings, suggested mitigations.
- When the role participates: after architecture and data flow assumptions are visible, before release readiness.
- Key interactions: works closely with Backend, Frontend, DevOps, Legal & Compliance, and Tech Lead.
- Detailed specification: [roles/security.md](./roles/security.md) — responsibilities, scope boundaries, and future follow-up work.

## DevOps (`devops`)

- Mission: keep deployment, environment, configuration, and operational readiness visible during planning.
- Primary outputs: deployment notes, environment assumptions, operational constraints, release readiness concerns.
- When the role participates: after implementation direction is clear enough to reason about environments and release flow.
- Key interactions: depends on Backend, Frontend, Security, QA, and Tech Lead.

## Data & Analytics (`data-analytics`)

- Mission: define what usage, funnel, and operational signals should be captured in the MVP without overcomplicating delivery.
- Primary outputs: analytics questions, measurement recommendations, event or reporting notes, data risks.
- When the role participates: after the product flow is understandable and before implementation planning is finalized.
- Key interactions: works with PO/PM, UX/UI, Backend, Customer Success, and Tech Lead.

## Customer Success (`customer-success`)

- Mission: represent onboarding, support, and operational clarity for real users once the MVP is in front of them.
- Primary outputs: support readiness notes, handoff concerns, user guidance gaps, post-release questions.
- When the role participates: late in V1 planning, near QA and release readiness review.
- Key interactions: reviews PO/PM, UX/UI, QA, Legal & Compliance, and Data & Analytics outputs.

# V2 Specialist Roles

These roles are intentionally deferred to V2. They matter, but they are not part of the current V1 operating loop.

## Performance Specialist

Deferred to V2 so V1 can focus on functional flow and basic delivery readiness before deeper runtime tuning.

## SEO Specialist

Deferred to V2 so V1 can focus on product workflow clarity before search optimization concerns.

## Accessibility Specialist

Deferred to V2 as a dedicated role, even though V1 roles should still surface obvious accessibility concerns where relevant.

## Finance & Cost Specialist

Deferred to V2 so V1 can validate delivery structure before adding cost-optimization as a distinct review lane.

## Marketing Specialist

Deferred to V2 so V1 can stay centered on delivery coordination rather than launch campaign planning.

# V1 Workflow Diagram

The V1 role flow is a human-reviewed sequence, not an orchestration engine:

```txt
PO/PM
↓
UX/UI
↓
Legal & Compliance
↓
Data & Analytics
↓
Security
↓
Tech Lead
↓
DevOps
↓
Frontend / Backend
↓
QA
↓
Customer Success
↓
Cleanup (future)
↓
Release readiness
```

Every major handoff in this flow still requires human approval in V1.

The full handoff map — context passed, expected output, timing, required vs optional, and human approval points — is documented in [V1_ROLE_HANDOFFS.md](./V1_ROLE_HANDOFFS.md).

# Role Philosophy

- Local-first: roles operate on local briefs, backlog files, prompts, and reports before any remote integration exists.
- Human-in-the-loop: roles produce recommendations, but humans decide what to accept, reject, revise, or postpone.
- Provider agnostic: roles describe delivery viewpoints, not behavior tied to one AI provider or tool.
- Roles are perspectives, not autonomous agents: the same human or assistant can play multiple roles as long as the context stays explicit.
- Specialists produce recommendations: outputs should suggest backlog updates, risks, questions, and tasks without silently changing source files.
- Humans make decisions: readiness, approval, sequencing, and release calls remain manual in V1.

## Current V1 Boundary

The local prompt tooling now supports all current V1 roles through the reusable templates and specialist prompt commands. V2-only specialist roles remain intentionally excluded until the roadmap expands beyond the current V1 operating loop.
