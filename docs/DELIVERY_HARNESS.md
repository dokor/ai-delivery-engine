# Delivery Harness

The Delivery Harness is ADE's local-first execution envelope for code agents
and LLM-backed providers. ADE does not replace Codex, Claude Code or Cursor; it
prepares the bounded task, context, permissions, workspace assumptions,
validations and result contract around those agents.

## Contract

The first contract version is `schemaVersion: 1` and is implemented by:

- `AgentExecutionRequest`: run id, node id, agent/provider, task
  specification, context pack, permissions, workspace, stop conditions and
  validation commands.
- `AgentExecutionResult`: status, summary, modifications, commands,
  validations, artifacts, usage, blockers, next action and the context pack
  manifest used for the run.

Supported result statuses are `succeeded`, `timed_out`, `tool_error`,
`permission_denied` and `agent_error`.

## Local Demo

Run:

```bash
pnpm harness:demo
pnpm harness:demo -- --provider mock-reviewer
```

The command writes:

- `outputs/harness/agent-execution-request.json`
- `outputs/harness/agent-execution-result.json`

The demo uses deterministic mock providers only. It does not call a network
provider and excludes sensitive context items before they can enter the request.

## Current Workspace Guarantee

The first implementation documents workspace isolation as a contract field. The
demo uses `current-worktree` with `writable: false`, which is suitable for a
traceable dry run. Future Project Run integration can replace that value with a
dedicated worktree or temporary copy without changing the request/result shape.
