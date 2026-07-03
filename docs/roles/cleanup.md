# Cleanup Specialist Role

Status: **Cross-cutting support role.** It keeps the repository healthy but is not part of the
per-story V1 delivery loop — it appears as `Cleanup (future)` in the workflow diagram in
[../AGENTS.md](../AGENTS.md), running periodically rather than on every backlog item.

This document is the detailed specification for the Cleanup role. It follows the same
convention as the other role specs under [../roles/](../roles/).

## Strategic Positioning

As generated files, documentation, examples, prompts, and workflows grow, the repository
accumulates dead code, stale docs, broken links, and generated noise. The Cleanup Specialist
exists to keep the repository, code, documentation, and Git history **clean and consistent**.

Its focus is **hygiene and maintainability, not product delivery.** It produces
human-approved recommendations only — it never deletes files or changes Git branches on its own.

## Mission

- keep the repository, code, docs, and Git history clean as the project grows;
- surface dead code, duplication, stale docs, broken links, and generated noise;
- recommend hygiene improvements that a human then approves and applies.

## Responsibilities

### Code hygiene

- detect dead code;
- identify duplicated helpers;
- suggest refactors;
- keep naming consistent;
- surface obsolete scripts.

### Documentation hygiene

- detect outdated docs;
- find duplicated documentation;
- identify broken or stale links;
- ensure README and Getting Started stay aligned;
- ensure examples match current commands.

### Git hygiene

- suggest stale branch cleanup;
- identify merged issues still open;
- identify PRs that should close issues;
- recommend label or milestone cleanup;
- keep issue/PR descriptions consistent.

### Generated artifact hygiene

- identify stale outputs;
- document which generated files should be ignored;
- recommend `.gitignore` updates;
- avoid committing local secrets or generated noise.

## Scope Boundaries

The Cleanup role overlaps with several others. These boundaries keep ownership clear.

### Cleanup vs Tech Lead

Tech Lead owns architecture and delivery decisions. Cleanup Specialist owns hygiene and
consistency recommendations.

### Cleanup vs QA

QA validates product behavior. Cleanup Specialist validates repository maintainability and
documentation consistency.

### Cleanup vs DevOps

DevOps owns deployment and runtime operations. Cleanup Specialist owns repository and workflow
cleanliness.

## Workflow Integration

- **Inputs:** the repository state — source tree, docs, examples, generated `outputs/`,
  `.gitignore`, and the open issues/PRs/branches on GitHub.
- **Outputs:** hygiene notes — dead-code and duplication findings, stale or broken-link doc
  reports, Git and issue/PR cleanup suggestions, and `.gitignore` / generated-artifact
  recommendations. All are human-reviewable and human-applied.
- **Timing:** cross-cutting. Runs periodically (e.g. before a release or after large merges)
  rather than on a single backlog item.

## Future Follow-up Work

These are tracked as separate follow-up issues and are intentionally out of scope here:

- Cleanup role template
- Cleanup response contract
- Cleanup checklist
- Local repository hygiene command
- Documentation stale-link checker
- Issue/PR hygiene workflow
- Generated outputs cleanup recommendations

## Constraints

Documentation-first. This role does **not** delete files automatically, change Git branches
automatically, call external APIs, or add model calls. Every cleanup recommendation stays
human-approved.

## Related

- Role summary and workflow diagram: [../AGENTS.md](../AGENTS.md)
- Other role specifications: [../roles/](../roles/)
