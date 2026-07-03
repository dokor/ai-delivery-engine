# Data & Analytics Specialist Role

Status: **V1 core role** — active in the current operating loop.

This document is the detailed specification for the Data & Analytics role. It complements
the shorter summary in [../AGENTS.md](../AGENTS.md), the handoff map in
[../V1_ROLE_HANDOFFS.md](../V1_ROLE_HANDOFFS.md), and the reusable prompt template in
[../../templates/data-analytics.md](../../templates/data-analytics.md).

## Strategic Positioning

Many projects fail because they collect data but never define how success is measured. The
Data & Analytics role exists to define **what should be measured and how**, and to do so
**before implementation starts** so tracking and measurement requirements are designed from
the beginning rather than retrofitted.

Its place in the V1 flow (see [../AGENTS.md](../AGENTS.md) for the full diagram):

```txt
PO/PM → UX/UI → Legal & Compliance → Data & Analytics → Security → Tech Lead → …
```

The role acts as a Product Analytics Engineer / Data Analyst. It participates early so the
measurement layer shapes the backlog, and it stays human-reviewed in V1.

## Mission

- define the smallest useful measurement layer for the MVP;
- identify KPI, funnel, event, and reporting gaps early;
- keep analytics planning aligned with product decisions instead of overengineering it.

## Responsibilities

### Product Analytics

- KPI definition;
- success metrics;
- funnel definition;
- activation metrics;
- retention metrics;
- conversion tracking.

### Tracking Strategy

- analytics events;
- event naming conventions;
- user journeys;
- attribution tracking;
- marketing measurement.

### Analytics Tooling

- GA4;
- GTM;
- Matomo;
- PostHog;
- custom analytics pipelines.

### Reporting

- dashboards;
- business metrics;
- operational metrics;
- stakeholder reporting.

### Data Quality

- missing tracking;
- duplicate events;
- inconsistent naming;
- measurement gaps.

## Scope Boundaries

The Data & Analytics role overlaps with several others. These boundaries keep each role's
ownership clear.

### Data vs PO/PM

PO/PM defines business objectives. Data defines how success and adoption are measured.

### Data vs UX

UX designs the user journey. Data measures the effectiveness of that journey.

### Data vs Legal & Compliance

Legal validates compliance and privacy requirements. Data defines useful measurement while
respecting those constraints (consent, retention limits, data minimization).

## Workflow Integration

- **Inputs:** relevant backlog stories and tasks; the project brief and user-flow context;
  business goals, activation signals, and reporting needs; PO/PM, UX/UI, and Customer Success
  notes affecting measurement; Legal & Compliance constraints on what data can be collected.
- **Outputs:** analytics notes linked to backlog item IDs; KPI, funnel, event, and dashboard
  recommendations; measurement gaps and data-quality concerns; open questions, assumptions,
  and analytics risks.
- **Handoffs:** documented in [../V1_ROLE_HANDOFFS.md](../V1_ROLE_HANDOFFS.md)
  (`PO/PM → Data & Analytics`, `Legal & Compliance → Data & Analytics`,
  `Data & Analytics → PO/PM`).

## Future Follow-up Work

These are tracked as separate follow-up issues and are intentionally out of scope here:

- Data role template refinements
- Analytics response contract
- Tracking plan generation
- KPI review workflow
- Dashboard recommendations
- Event taxonomy generation
- Analytics checklist generation

## Constraints

Documentation-first. This role does **not** introduce analytics integrations, tracking code,
external APIs, model calls, or a new architecture direction. It produces human-reviewable
recommendations only — it never assumes analytics tools are already configured, invents
metrics without a clear product purpose, or claims measurement is complete without human
review.

## Related

- Prompt template: [../../templates/data-analytics.md](../../templates/data-analytics.md)
- Role summary: [../AGENTS.md](../AGENTS.md)
- Handoff map: [../V1_ROLE_HANDOFFS.md](../V1_ROLE_HANDOFFS.md)
