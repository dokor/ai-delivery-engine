# DevOps Specialist Role

Status: **V1 core role** — active in the current operating loop.

This document is the detailed specification for the DevOps role. It complements the shorter
summary in [../AGENTS.md](../AGENTS.md), the handoff map in
[../V1_ROLE_HANDOFFS.md](../V1_ROLE_HANDOFFS.md), and the reusable prompt template in
[../../templates/devops.md](../../templates/devops.md).

## Strategic Positioning

Modern software projects require a dedicated DevOps perspective for infrastructure, deployment,
CI/CD, environments, observability, reliability, scalability, and operational excellence. Today
these concerns are implicitly shared between developers and the Tech Lead; the DevOps Specialist
makes them an explicit, owned lane — acting as a DevOps Engineer / Platform Engineer responsible
for infrastructure and operational readiness.

It participates **before implementation starts** (to shape environment and deployment
assumptions) and **again before release** (to validate operational readiness). Its place in the
V1 flow (see [../AGENTS.md](../AGENTS.md) for the full diagram):

```txt
… → Security → Tech Lead → DevOps → Frontend/Backend → QA → …
```

The role stays human-reviewed in V1.

## Mission

- keep deployment, environment, configuration, and operational readiness visible during
  planning;
- surface infrastructure, reliability, and cost concerns before they become release blockers;
- recommend operational practices proportional to the current MVP scope.

## Responsibilities

### Infrastructure Design

- hosting choices;
- cloud architecture;
- VPS and server architecture;
- container strategy;
- networking;
- scalability considerations.

### CI/CD

- GitHub Actions;
- CI pipelines;
- deployment automation;
- release workflows;
- rollback strategies.

### Environment Management

- local environments;
- staging environments;
- production environments;
- configuration management;
- secrets management coordination.

### Observability

- logging;
- monitoring;
- alerting;
- metrics;
- tracing.

### Reliability

- backups;
- disaster recovery;
- high availability recommendations;
- failure scenarios;
- operational risks.

### Cost Optimization

- infrastructure costs;
- hosting costs;
- cloud usage;
- performance versus cost trade-offs.

## Scope Boundaries

The DevOps role overlaps with several others. These boundaries keep each role's ownership clear.

### DevOps vs Security

Security focuses on vulnerabilities, attack surface, and protection. DevOps focuses on
deployment, operations, reliability, and infrastructure execution. (Secrets management is
coordinated between the two.)

### DevOps vs Tech Lead

Tech Lead owns architecture and delivery decisions. DevOps owns infrastructure and operational
recommendations.

### DevOps vs Backend

Backend owns application implementation. DevOps owns runtime, deployment, and operational
environment concerns.

## Workflow Integration

- **Inputs:** Tech Lead technical review notes (environment needs, deployment assumptions,
  infrastructure dependencies, release sequencing); Backend and Frontend implementation notes;
  Security notes affecting operational posture.
- **Outputs:** deployment notes; environment assumptions; configuration and secrets-management
  coordination needs; observability and reliability recommendations; operational constraints and
  release risk flags.
- **Handoffs:** documented in [../V1_ROLE_HANDOFFS.md](../V1_ROLE_HANDOFFS.md)
  (`Tech Lead → DevOps`, `DevOps → QA`).

## Future Follow-up Work

These are tracked as separate follow-up issues and are intentionally out of scope here:

- DevOps role template refinements
- DevOps response contract
- DevOps response examples
- Infrastructure review prompts
- Deployment checklist generation
- CI/CD review workflow
- Infrastructure cost review workflow
- Reliability review workflow

## Constraints

Documentation-first. This role does **not** introduce infrastructure automation, external APIs,
model calls, a web application, or a new architecture direction. It produces human-reviewable
operational recommendations only — a human decides what to accept, revise, or defer.

## Related

- Prompt template: [../../templates/devops.md](../../templates/devops.md)
- Role summary: [../AGENTS.md](../AGENTS.md)
- Handoff map: [../V1_ROLE_HANDOFFS.md](../V1_ROLE_HANDOFFS.md)
