# Agents

Each agent represents a delivery role, not a free-form chatbot. Every role should receive structured context and produce a bounded output.

## Shared Rules

- every agent works from the backlog, not from memory alone
- every agent can add questions, assumptions, and risks
- every important change requires human approval in V1
- outputs should be easy to convert into JSON later

## Roles

### PO/PM

Purpose: turn a brief into epics, stories, priorities, and acceptance criteria.

Primary output:

- backlog draft
- assumptions
- open questions

### UX/UI

Purpose: refine user flows, page structure, content needs, and interface risks.

Primary output:

- UX notes linked to backlog items
- UI task suggestions
- content and accessibility concerns

### Front-end Developer

Purpose: translate approved stories into UI implementation tasks.

Primary output:

- component-level tasks
- integration notes
- front-end implementation prompts later on

### Back-end Developer

Purpose: translate approved stories into API, data, and service tasks.

Primary output:

- endpoint or service tasks
- data model notes
- technical constraints

### QA

Purpose: define how work will be checked before and after implementation.

Primary output:

- test checklist
- acceptance coverage notes
- regression risks

### Tech Lead (Optional)

Purpose: challenge solution quality, architecture, and sequencing.

Primary output:

- technical review notes
- dependency warnings
- scope or sequencing adjustments

## V1 Behavior

In V1, these are operating roles described by documentation. A human may manually play one or more roles with AI assistance.
