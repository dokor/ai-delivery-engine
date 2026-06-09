# Roadmap

## Phase 0: Documentation Foundation

Goal: define the operating model before building software.

Deliverables:

- repository structure
- product vision
- agent definitions
- backlog model
- workflow and MVP boundaries

## Phase 1: Manual Backlog Pilot

Goal: prove that a brief can become a usable backlog with structured human review.

Deliverables:

- brief template
- PO/PM prompt template
- manual backlog review checklist
- sample backlog output format

Success signal:

`a human can use the repo docs to produce a backlog draft in a repeatable way`

## Phase 2: Semi-Automatic Orchestration

Goal: add local tooling without removing human checkpoints.

Deliverables:

- local runner or CLI
- file-based project and backlog storage
- agent run history
- optional GitHub issue export

Success signal:

`the flow is faster, but every important decision still requires human approval`

## Phase 3: Specialist Agent Support

Goal: add role-specific refinement after the initial backlog exists.

Deliverables:

- UX/UI output templates
- front-end task breakdown
- back-end task breakdown
- QA checklist generation
- optional Tech Lead review step

## Phase 4: GitHub-Centered Delivery

Goal: connect backlog items to implementation work.

Deliverables:

- issue creation
- issue enrichment
- implementation prompt generation
- pull request support

## Phase 5: Controlled Automation

Goal: automate low-risk steps while keeping escalation paths for humans.

Deliverables:

- auto-triggered agent chains
- policy-based approvals
- exception handling
- quality gates

## Phase 6: Full Delivery Engine

Goal: support multi-project, mostly automated delivery workflows.

Deliverables:

- project cockpit
- audit trail
- reusable templates
- configurable automation modes
