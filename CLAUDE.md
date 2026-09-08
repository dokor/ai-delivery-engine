# AI Delivery Engine — Claude Code adapter

Claude Code must follow the canonical provider-neutral ADE instructions in [`AGENTS.md`](./AGENTS.md).

`AGENTS.md` defines the delivery lifecycle, readiness gates, specialist reviews, validation rules, publication boundary, and human approval boundary. Do not duplicate or override those rules here.

## Claude Code notes

- Read `AGENTS.md` before starting delivery work.
- Treat structured ADE handoffs and execution context as authoritative for the current run.
- Use the repository commands, templates, and specialist roles referenced by `AGENTS.md`.
- If an external orchestrator such as ADE Control Plane owns commits, pushes, issue metadata, or pull-request creation, do not perform those steps yourself.
- Never merge a pull request without explicit human approval.

This file exists only so Claude Code discovers the same ADE contract that Codex and other agents receive through `AGENTS.md`.
