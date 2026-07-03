# V1 Role Handoffs

This document maps context flows between V1 roles. It describes what is passed, what is expected in return, when each handoff happens, whether it is required or optional, and where a human must decide before work continues.

The backlog item is the primary handoff surface. Every handoff operates through reviewed local artifacts — Markdown files, JSON outputs, prompt files — not through automated triggers.

## How to read this document

Each entry follows this structure:

- **Context passed** — what the source role provides to the target role
- **Expected output** — what the target role should produce
- **When** — before implementation, during implementation, or before release
- **Required or optional** — whether this handoff must happen before the next step is considered valid
- **Human approval point** — what a human must decide before the output is treated as accepted

---

## PO/PM → UX/UI

**Context passed:** Validated backlog draft with epics, stories, and tasks. Open questions and assumptions from the brief.

**Expected output:** UX notes per backlog item — flow clarifications, content gaps, user journey concerns, accessibility flags, and suggested UX task additions.

**When:** Before implementation planning. After the backlog draft is reviewed and before Frontend or Backend work is planned.

**Required or optional:** Required for any story that involves a user-facing surface.

**Human approval point:** A human reviews the UX notes and decides which items are accepted, revised, or deferred before stories are marked ready for implementation.

---

## PO/PM → Legal & Compliance

**Context passed:** Validated backlog draft, project summary, and any constraints or data-handling concerns identified in the brief.

**Expected output:** Compliance notes — GDPR/RGPD concerns, consent requirements, data-handling obligations, policy document needs, and suggested legal constraints on the backlog.

**When:** Before implementation. After the main user flow is clear and before backend or frontend implementation assumptions harden.

**Required or optional:** Required for any project that handles personal data, user consent, or regulated activity. Optional for purely internal or infrastructure projects with no end-user data.

**Human approval point:** A human reviews compliance notes and decides whether any story scope must change before implementation starts.

---

## PO/PM → Data & Analytics

**Context passed:** Validated backlog draft, success criteria from the brief, and product goals.

**Expected output:** Analytics notes — recommended events to capture, funnel or usage signals that matter for the MVP, data risks, and measurement questions to answer before release.

**When:** Before implementation planning is finalized. After the product flow is understandable.

**Required or optional:** Optional in V1. Recommended whenever success criteria are tied to measurable user behavior.

**Human approval point:** A human decides which analytics recommendations are accepted and added to the backlog before implementation starts.

---

## UX/UI → SEO

**Context passed:** UX notes covering content structure, page intent, user journeys, and any known URL or routing decisions.

**Expected output:** SEO notes tied to the content surface — metadata and structured-data recommendations, content-hierarchy and internal-linking suggestions, crawlability and indexing risks, and suggested SEO tasks.

**When:** Before implementation planning. After UX/UI content structure is clear and before Frontend implementation planning is finalized.

**Required or optional:** Required for projects where organic search visibility matters (public, content-driven, or marketing-facing surfaces). Optional for purely internal tools with no search surface.

**Human approval point:** A human reviews the SEO notes and decides which recommendations are accepted, revised, or deferred before implementation planning continues.

---

## UX/UI → Security

**Context passed:** UX notes covering user flow, input surfaces, authentication moments, data display areas, and any sensitive context the UI exposes.

**Expected output:** Security notes tied to the UX surface — input validation risks, trust boundary concerns, sensitive data display warnings, authentication edge cases, and suggested mitigations.

**When:** After UX direction is clear and before Frontend implementation planning is finalized.

**Required or optional:** Required when the UX surface includes authentication, payments, personal data display, or form submissions.

**Human approval point:** A human reviews security findings against the UX notes and decides whether implementation planning should be blocked or adjusted.

---

## Legal & Compliance → Data & Analytics

**Context passed:** Compliance notes covering which data can be collected, consent requirements, retention limits, and lawful bases for processing.

**Expected output:** Analytics notes revised to fit legal constraints — events or measurements removed or adjusted to align with consent and data minimization requirements.

**When:** Before any tracking or measurement implementation planning is finalized.

**Required or optional:** Required when analytics recommendations involve personal data or behavioral tracking.

**Human approval point:** A human confirms that the final analytics plan respects the legal constraints before tracking implementation starts.

---

## Legal & Compliance → Security

**Context passed:** Compliance notes covering data processing obligations, sensitive data categories, consent scope, and any AI-related regulatory concerns.

**Expected output:** Security notes that address the regulatory surface — data-at-rest and data-in-transit risks, access control obligations tied to GDPR or similar frameworks, and logging and audit trail requirements.

**When:** Before implementation planning for backend data handling and access control.

**Required or optional:** Required when the project involves regulated data categories or AI-assisted processing with human-review obligations.

**Human approval point:** A human decides whether any security finding from the legal context requires a scope change before implementation.

---

## Security → Tech Lead

**Context passed:** Security review notes covering threat vectors, trust boundaries, sensitive data handling risks, and suggested mitigations per backlog item.

**Expected output:** Technical review of whether the mitigations fit the planned architecture, sequencing adjustments where security concerns affect implementation order, and any architectural changes required.

**When:** After security review and before final implementation planning is locked.

**Required or optional:** Required when security findings affect architecture or implementation sequencing.

**Human approval point:** A human approves the final technical sequencing plan that incorporates security mitigations before implementation tasks are finalized.

---

## Tech Lead → DevOps

**Context passed:** Technical review notes covering environment needs, deployment assumptions, infrastructure dependencies, and release sequencing expectations.

**Expected output:** DevOps notes — environment readiness concerns, deployment flow assumptions, configuration management needs, operational constraints, and release risk flags.

**When:** After implementation direction is clear and before release readiness decisions.

**Required or optional:** Required before any release readiness decision is made.

**Human approval point:** A human reviews DevOps notes and decides whether release readiness can proceed or whether environment or configuration work must be completed first.

---

## SEO → Frontend

**Context passed:** SEO notes covering metadata, structured data, canonical URLs, robots directives, sitemap and redirect strategy, and content-hierarchy expectations.

**Expected output:** Frontend implementation notes that account for the SEO requirements — how metadata and structured data are rendered, canonical/robots handling, and any routing or redirect work needed.

**When:** Before Frontend implementation planning is finalized, after SEO review is accepted.

**Required or optional:** Required for stories with public pages or search-indexable surfaces.

**Human approval point:** A human confirms that the accepted SEO requirements are reflected in the frontend implementation plan before work starts.

---

## Tech Lead → Frontend

**Context passed:** Technical review notes covering component architecture expectations, state management concerns, integration dependencies, and sequencing priorities.

**Expected output:** Frontend implementation notes — component breakdown, state handling plan, integration risks, delivery scope for the sprint, and task-level estimates or flags.

**When:** After story scope is stable and UX direction is accepted.

**Required or optional:** Required for every story with a UI component.

**Human approval point:** A human reviews frontend implementation notes and confirms that task scope and sequencing align with the accepted backlog before work starts.

---

## Tech Lead → Backend

**Context passed:** Technical review notes covering API design expectations, data model concerns, service boundaries, and integration sequencing.

**Expected output:** Backend implementation notes — API surface plan, data handling approach, service behavior, integration risks, and technical constraints per story.

**When:** After story scope is stable and data handling obligations are clear.

**Required or optional:** Required for every story with a backend component.

**Human approval point:** A human reviews backend implementation notes and confirms that the approach fits the accepted backlog and legal or security constraints before work starts.

---

## Frontend → QA

**Context passed:** Frontend implementation notes covering component scope, state behavior, integration points, and edge cases surfaced during planning.

**Expected output:** QA coverage notes for the frontend surface — acceptance test cases, visual regression concerns, interaction edge cases, and browser or device risks.

**When:** After frontend implementation planning is accepted and before release readiness review.

**Required or optional:** Required for every story with a UI component before it is considered implementation-ready.

**Human approval point:** A human reviews QA coverage notes and decides whether the acceptance criteria are sufficient or whether the story needs clarification before implementation starts.

---

## Backend → QA

**Context passed:** Backend implementation notes covering API contracts, data flow assumptions, service behavior, error handling, and edge cases.

**Expected output:** QA coverage notes for the backend surface — API contract test cases, error path coverage, data integrity checks, and integration edge cases.

**When:** After backend implementation planning is accepted.

**Required or optional:** Required for every story with a backend component before it is considered implementation-ready.

**Human approval point:** A human reviews QA coverage notes and confirms the test plan before implementation starts.

---

## DevOps → QA

**Context passed:** DevOps notes covering environment assumptions, deployment flow, configuration dependencies, and operational constraints.

**Expected output:** QA notes for release and environment coverage — environment parity risks, deployment smoke test expectations, rollback readiness, and operational edge cases.

**When:** Near release readiness review, after DevOps notes are accepted.

**Required or optional:** Required before release readiness is declared.

**Human approval point:** A human decides whether operational and environment readiness meets the release threshold.

---

## QA → Customer Success

**Context passed:** QA coverage notes — acceptance test results, known limitations, open risks, and items flagged for post-release monitoring.

**Expected output:** Customer Success readiness notes — onboarding gaps, support documentation needs, user-facing limitations to communicate, and post-release support risks.

**When:** Late in V1 planning, after QA review and before release readiness is approved.

**Required or optional:** Required before any user-facing release.

**Human approval point:** A human reviews Customer Success notes and decides whether support readiness is sufficient before release is approved.

---

## Customer Success → PO/PM

**Context passed:** Customer Success notes covering support concerns, user journey gaps, post-release risks, and open questions about real-world usage.

**Expected output:** Backlog updates — new stories or tasks created from support concerns, deferred items reprioritized, or assumptions corrected based on operational feedback.

**When:** After release or after Customer Success review near release. Also applies in iterative cycles when support feedback shapes the next backlog revision.

**Required or optional:** Optional in V1 first release. Required for any subsequent iteration where support signals exist.

**Human approval point:** A human reviews Customer Success feedback and decides which backlog updates to accept, defer, or discard before the next cycle starts.

---

## Data & Analytics → PO/PM

**Context passed:** Analytics notes covering measurement gaps, funnel signals, missing events, and data questions that remain open after the MVP.

**Expected output:** Backlog updates — new analytics stories or tasks, revised acceptance criteria that include measurement conditions, or deferred analytics work captured as future scope.

**When:** After the MVP analytics plan is reviewed and near release readiness. Also after early usage data is available in iterative cycles.

**Required or optional:** Optional in V1 first release. Required when success criteria are explicitly tied to measurable outcomes.

**Human approval point:** A human reviews analytics findings and decides what to add to the backlog, defer to V2, or discard before the next planning cycle.

---

## General rules

All handoffs in V1 are documentation-first. No handoff triggers a next step automatically. A human reads the output, makes a decision, and explicitly moves the backlog forward.

Outputs should take the form of notes, backlog update suggestions, or structured findings — not silent file edits or status changes on behalf of another role.

A role can produce output for multiple downstream roles in parallel, but each output is reviewed separately before it is treated as accepted.

V2 roles such as Performance, Accessibility, Finance, and Marketing are not included in this handoff map. They will be added when the V2 roadmap expands the operating loop.
