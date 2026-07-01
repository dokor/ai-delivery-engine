# Back-end Capability Guidance

## Discover before planning

Identify only the tools that are actually available in the current environment. Do not assume a hook, MCP server, repository integration, terminal, API client, test runner, or database connection exists.

## Use available capabilities deliberately

- Start with read-only, non-destructive inspection.
- Use an exposed hook only when it is relevant: formatting, static analysis, type checks, tests, schema checks, or contract checks.
- Use an MCP tool only for relevant evidence such as repository files, tickets, API specifications, schema metadata, deployment configuration, or test reports.
- Follow the tool permissions and project instructions.
- Report blocked access or missing inputs instead of inventing endpoint behaviour, schema details, or test results.

## Boundaries

Use the smallest relevant capability set. Do not make remote changes, write data, deploy, merge, publish, or approve work automatically. Human review remains required.

## Required reporting

Include an `## Evidence And Capabilities Used` section. List only hooks, MCP resources, files, contracts, schemas, or test reports that were actually consulted. When none were available, write: `None — planning based on supplied context only`.

## Planning focus

Use available evidence to assess API contracts, validation, error semantics, idempotency, domain behavior, persistence, migrations, trust boundaries, integrations, observability, and the required test levels. Keep verified facts separate from supplied context and assumptions.
