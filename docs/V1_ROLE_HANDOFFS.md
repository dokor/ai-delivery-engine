# V1 Role Handoffs

This document explains how context moves between roles in the current V1 workflow.

V1 handoffs are:

- manual
- local-first
- provider-agnostic
- human-reviewed

They are not automated transitions, queue processing, or orchestration rules. A handoff in V1 means a human decides that one role's output is ready to be used as input for another role.

## How To Read This Document

Each handoff below describes:

- source role
- target role
- context passed
- expected output
- whether the handoff is required or optional in V1
- when it usually happens
- what human approval is needed before moving forward

## V1 Handoff Sequence

```txt
PO/PM
  -> UX/UI
  -> Legal & Compliance
  -> Data & Analytics
UX/UI
  -> Security
Legal & Compliance
  -> Data & Analytics
  -> Security
Security
  -> Tech Lead
Tech Lead
  -> DevOps
  -> Frontend
  -> Backend
Frontend / Backend / DevOps
  -> QA
QA
  -> Customer Success
Customer Success / Data & Analytics
  -> PO/PM
```

This is a practical V1 review sequence, not a hard execution engine. Teams can pause, repeat, or skip optional handoffs as long as a human keeps the backlog and outputs coherent.

## Handoff Table

| Handoff | Context Passed | Expected Output | V1 Status | Usually Happens | Human Approval Needed |
| --- | --- | --- | --- | --- | --- |
| `PO/PM -> UX/UI` | Brief, deterministic backlog or imported backlog, story priorities, acceptance criteria, open questions | UX notes, flow clarifications, content gaps, suggested UX tasks | Required | After backlog framing is stable enough to review the main user journey | A human accepts that the backlog stories are clear enough for UX review |
| `PO/PM -> Legal & Compliance` | Brief, backlog stories, data-handling assumptions, user flows, consent-sensitive scope | Privacy, consent, retention, and documentation concerns; suggested compliance tasks or constraints | Required | After the main user flow and data touchpoints are visible | A human accepts that the product scope is clear enough to review legal and compliance risks |
| `PO/PM -> Data & Analytics` | Brief, success criteria, backlog stories, funnel assumptions, business goals | KPI notes, event ideas, measurement questions, analytics task suggestions | Required | After MVP goals and main user actions are clear | A human accepts that the backlog is stable enough to discuss measurement |
| `UX/UI -> Security` | UX notes, key flows, user actions, interface assumptions, exposed data-entry points | Security concerns tied to user flows, trust boundaries, misuse risks | Optional | After UX highlights the main flow and interface decisions | A human accepts that the UX review is clear enough to inspect user-facing security risks |
| `Legal & Compliance -> Data & Analytics` | Consent concerns, retention expectations, lawful-processing constraints, documentation needs | Analytics constraints, consent-aware tracking questions, measurement caveats | Optional | When analytics planning touches personal data or consent-sensitive flows | A human accepts that compliance notes are concrete enough to shape measurement decisions |
| `Legal & Compliance -> Security` | Privacy risks, consent boundaries, sensitive-data handling concerns, regulatory cautions | Security follow-up on access control, data handling, logging, or audit concerns | Required when sensitive data is in scope | After compliance review surfaces data or access risks | A human accepts that the compliance review identifies security-relevant concerns worth action |
| `Security -> Tech Lead` | Security findings, misuse scenarios, access-control concerns, dependency risks | Technical sequencing notes, architecture fit concerns, mitigation priorities | Required | After security has identified meaningful risks or blockers | A human accepts that the security concerns are material enough to affect technical planning |
| `Tech Lead -> DevOps` | Sequencing decisions, architecture-fit notes, environment assumptions, operational dependencies | Deployment, environment, rollback, and monitoring tasks or cautions | Optional but recommended | When implementation direction is stable enough to reason about release and operations | A human accepts the current technical direction before operational planning deepens |
| `Tech Lead -> Frontend` | Sequencing notes, scope tradeoffs, interface dependencies, risk flags | Front-end implementation planning aligned with current technical constraints | Required when frontend work is in scope | Before detailed UI implementation planning | A human accepts the current scope and technical tradeoffs for front-end review |
| `Tech Lead -> Backend` | Technical review notes, dependency order, service or data constraints, risk flags | Back-end implementation planning aligned with current technical constraints | Required when backend work is in scope | Before detailed service or data planning | A human accepts the current scope and technical tradeoffs for back-end review |
| `Frontend -> QA` | Front-end tasks, state-handling notes, user-visible assumptions, integration concerns | QA checklist additions, acceptance coverage notes, UI regression risks | Required when frontend work is in scope | After front-end planning exists | A human accepts that the front-end plan is detailed enough to review test coverage |
| `Backend -> QA` | Service behavior notes, data assumptions, API expectations, edge cases | QA checks for service behavior, error handling, and integration coverage | Required when backend work is in scope | After back-end planning exists | A human accepts that the back-end plan is detailed enough to review test coverage |
| `DevOps -> QA` | Environment notes, deployment assumptions, operational constraints, rollback or monitoring concerns | QA environment notes, release-readiness checks, operational test cautions | Optional but recommended | After operational assumptions are visible | A human accepts that operational notes are mature enough to affect QA scope |
| `QA -> Customer Success` | Acceptance coverage notes, user-facing risks, release blockers, confusing flows | Onboarding concerns, support readiness notes, user-documentation gaps, release clarity feedback | Optional but recommended | Near late-stage review, after QA has surfaced user-facing issues | A human accepts that QA findings are ready for customer-facing interpretation |
| `Customer Success -> PO/PM` | Support readiness notes, onboarding gaps, release communication concerns, adoption risks | Backlog updates, clarification requests, post-release questions, scope adjustments | Required near final review | Before deciding implementation or release readiness | A human accepts that customer-facing concerns should feed back into backlog decisions |
| `Data & Analytics -> PO/PM` | KPI notes, tracking questions, funnel gaps, reporting suggestions | Backlog clarifications, measurement tasks, success criteria refinement | Required near backlog refinement | After measurement needs are understood well enough to affect scope | A human accepts that analytics feedback should influence backlog framing |

## Handoff Details

### PO/PM -> UX/UI

Use this handoff when the backlog has enough story framing for UX review. Pass the brief, stories, acceptance criteria, assumptions, and any obvious content constraints. Move forward only after a human agrees the current backlog is coherent enough for a UX pass.

### PO/PM -> Legal & Compliance

Use this handoff when the backlog exposes data collection, consent, or policy-sensitive user flows. Pass the brief, stories, data assumptions, and user journey notes. Move forward only after a human agrees the flow is concrete enough to review compliance risk.

### PO/PM -> Data & Analytics

Use this handoff when the team can already describe what “success” looks like for the MVP. Pass the brief, goals, stories, and success criteria. Move forward only after a human agrees the product flow is stable enough for measurement planning.

### UX/UI -> Security

Use this handoff when UX notes reveal meaningful user-facing risks such as sensitive inputs, account boundaries, or confirmation flows. Pass flow notes and user actions, not just raw stories. Move forward only after a human agrees the UX review is specific enough to surface real security concerns.

### Legal & Compliance -> Data & Analytics

Use this handoff when tracking, reporting, or retention choices depend on consent or lawful processing. Pass consent constraints and retention cautions along with the relevant story context. Move forward only after a human agrees that analytics planning should reflect those constraints.

### Legal & Compliance -> Security

Use this handoff when privacy and compliance review surfaces sensitive-data handling or access concerns. Pass the concrete compliance findings, not generic warnings. Move forward only after a human agrees those concerns should influence security review.

### Security -> Tech Lead

Use this handoff when security findings are strong enough to affect sequencing, architecture fit, or scope risk. Pass the findings with impact and mitigation context. Move forward only after a human agrees those risks are material for technical planning.

### Tech Lead -> DevOps

Use this handoff when the implementation direction is defined enough to reason about environments and release flow. Pass technical sequencing notes and any environment assumptions already known. Move forward only after a human agrees the architecture direction is stable enough for operational review.

### Tech Lead -> Frontend

Use this handoff when UI implementation planning should respect technical dependencies or scope tradeoffs already identified. Pass the relevant stories, sequencing notes, and dependency warnings. Move forward only after a human agrees the front-end path is ready for detailed breakdown.

### Tech Lead -> Backend

Use this handoff when service or data planning should align with technical sequencing and risk notes. Pass the relevant stories, dependency order, and architecture cautions. Move forward only after a human agrees the back-end path is ready for detailed breakdown.

### Frontend -> QA

Use this handoff when front-end tasks and states are explicit enough to test. Pass UI task breakdown, state assumptions, and visible error or edge cases. Move forward only after a human agrees the plan is detailed enough for meaningful QA review.

### Backend -> QA

Use this handoff when service behavior, validation rules, or integration assumptions are clear enough to check. Pass service notes, data concerns, and expected error handling. Move forward only after a human agrees the back-end behavior is concrete enough for QA review.

### DevOps -> QA

Use this handoff when release or environment assumptions affect test readiness. Pass environment constraints, rollout cautions, and rollback or monitoring expectations. Move forward only after a human agrees these operational notes are worth including in QA review.

### QA -> Customer Success

Use this handoff when QA findings expose user-facing confusion, release risks, or support concerns. Pass the specific findings that affect onboarding, support, or communication. Move forward only after a human agrees that customer-facing review should react to those findings.

### Customer Success -> PO/PM

Use this handoff when support readiness, onboarding clarity, or release-note needs should change backlog decisions. Pass support notes, user guidance gaps, and adoption concerns. Move forward only after a human agrees those concerns should influence scope or backlog wording.

### Data & Analytics -> PO/PM

Use this handoff when KPI, funnel, or event questions should shape backlog priorities or success criteria. Pass measurement notes linked to specific backlog items. Move forward only after a human agrees that analytics feedback should adjust the backlog.

## What Is Intentionally Not Automated

These handoffs are not automated in V1:

- no role is auto-triggered by another role
- no file watcher or workflow engine advances the process
- no response is accepted automatically
- no backlog item is re-assigned automatically
- no remote issue is created as part of a handoff
- no implementation prompt is generated automatically from an unreviewed handoff

In V1, a handoff happens only because a human chooses to pass context from one role to another.

## How To Save Handoff Notes Locally

Keep handoff notes simple and local. In V1, acceptable handoff artifacts include:

- exported backlog item Markdown files under `outputs/exported-items/`
- specialist prompt files under `outputs/specialist-prompts/`
- saved specialist responses as local Markdown files
- specialist check JSON and Markdown reports under `outputs/`
- backlog review JSON and Markdown reports under `outputs/`

Practical habit:

1. keep the backlog item Markdown as the anchor
2. keep specialist prompts and responses tied to item IDs
3. keep review reports in `outputs/`
4. let a human decide which notes should influence the backlog next

V1 does not require a dedicated handoff file format yet.

## How This Relates To Specialist Prompts And Specialist Checks

Specialist prompts are the practical handoff mechanism for many V1 transitions.

Typical pattern:

```txt
exported backlog item -> specialist prompt -> manual specialist response -> specialist:check -> human review
```

How the pieces fit:

- the exported backlog item carries the local context
- the specialist prompt frames the handoff for the target role
- the saved Markdown response is the handoff output
- `specialist:check` validates structure and suspicious claims only
- a human decides whether to accept, revise, or reject the handoff output

This keeps V1 aligned with:

- local-first files
- provider-agnostic prompting
- human-reviewed transitions
- no orchestration engine
