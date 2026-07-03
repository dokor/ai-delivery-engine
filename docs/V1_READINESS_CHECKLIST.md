# V1 Readiness Checklist

This checklist defines when the current local-first V1 workflow is ready to be considered complete.

It is a readiness gate, not a roadmap extension. If an item below is not true yet, V1 is not ready. If a capability is intentionally out of scope for V1, it should stay out of scope rather than being treated as a blocker to solve immediately.

## 1. Project Positioning

- [ ] The project is still local-first.
- [ ] The project is still documentation-first.
- [ ] The project is still provider-agnostic.
- [ ] The project is still human-in-the-loop.
- [ ] No mandatory external integration is required to use the V1 workflow.

## 2. Install And Basic Commands

- [ ] A maintainer can install dependencies with `pnpm install`.
- [ ] Type checking passes with `pnpm typecheck`.
- [ ] Unit tests pass with `pnpm test`.
- [ ] Demo validation passes with `pnpm demo:validate`.
- [ ] Local status can be inspected with `pnpm project:status`.

## 3. Core Local Workflow

- [ ] A deterministic backlog draft can be generated from a local brief.
- [ ] A PO/PM manual prompt can be generated from that brief.
- [ ] A manual PO/PM response can be saved locally as JSON.
- [ ] The PO/PM response can be imported and validated locally.
- [ ] A deterministic backlog review can be produced.
- [ ] The validated backlog can be exported to one Markdown file per backlog item.
- [ ] Specialist prompts can be generated from exported backlog items.
- [ ] A specialist response can be saved locally as Markdown.
- [ ] A specialist response can be checked locally with `pnpm specialist:check`.
- [ ] A human still makes the final decision at every major checkpoint.

## 4. Role Coverage

- [ ] Current V1 roles are documented in [AGENTS.md](./AGENTS.md).
- [ ] Reusable V1 role templates exist under [../templates/](../templates/).
- [ ] Specialist prompt generation supports all current V1 specialist roles:
  `ux-ui`, `seo`, `frontend`, `backend`, `qa`, `tech-lead`, `legal-compliance`, `security`, `devops`, `data-analytics`, `customer-success`.
- [ ] V2 roles remain explicitly deferred and are not required for V1 readiness:
  `performance`, `accessibility`, `finance-cost`, `marketing`.

## 5. Contracts And Fixtures

- [ ] A PO/PM response contract exists in [contracts/PO_PM_OUTPUT_CONTRACT.md](./contracts/PO_PM_OUTPUT_CONTRACT.md).
- [ ] A specialist response contract exists in [contracts/SPECIALIST_RESPONSE_CONTRACT.md](./contracts/SPECIALIST_RESPONSE_CONTRACT.md).
- [ ] The general demo fixture exists in [../examples/demo-project/README.md](../examples/demo-project/README.md).
- [ ] The all-V1-roles demo fixture exists in [../examples/demo-v1-roles/README.md](../examples/demo-v1-roles/README.md).
- [ ] Specialist response examples exist in [../examples/specialist-responses/README.md](../examples/specialist-responses/README.md).

## 6. Outputs And Reports

- [ ] Deterministic backlog JSON and Markdown outputs are produced.
- [ ] PO/PM prompt Markdown output is produced.
- [ ] Normalized backlog JSON and Markdown outputs are produced.
- [ ] Backlog review JSON and Markdown outputs are produced.
- [ ] Exported backlog item Markdown files are produced.
- [ ] Export manifest output is produced.
- [ ] Specialist prompt files are produced.
- [ ] Specialist prompt batch `index.json` and `README.md` are produced.
- [ ] Specialist check JSON and Markdown reports are produced.
- [ ] Project status JSON is produced.

## 7. Safety And Boundaries

- [ ] No model call is required inside the repository to complete the workflow.
- [ ] No external API is required for V1 usage.
- [ ] No remote issue creation is required.
- [ ] No automatic approval exists.
- [ ] No automatic implementation exists.
- [ ] No `n8n` dependency is required.
- [ ] No web app is required.
- [ ] No database is required.
- [ ] File I/O is protected against path traversal via `assertSafePath`.
- [ ] JSON inputs are bounded by a 10 MB size limit.

## 8. Manual Approval Gates

- [ ] The brief is accepted by a human before the team relies on it.
- [ ] The PO/PM response is accepted by a human before import is treated as final.
- [ ] The normalized backlog is accepted by a human before downstream refinement.
- [ ] The backlog review findings are accepted by a human before implementation planning continues.
- [ ] Specialist responses are accepted by a human after `specialist:check`.
- [ ] Implementation readiness is accepted by a human and never inferred automatically.

## 9. Known V1 Limitations

- [ ] PO/PM responses are still copied manually from an assistant into local files.
- [ ] Specialist responses are still copied manually from an assistant into local files.
- [ ] The specialist checker does not grade quality semantically.
- [ ] There is no synchronization to Notion or GitHub yet.
- [ ] Multi-project workspace management is not required for V1 readiness unless it is already implemented later without changing the current boundary.
- [ ] There is no role orchestration engine yet.
- [ ] There are no autonomous agents yet.

## 10. Suggested Final Validation Sequence

Run this from the repository root before declaring V1 ready:

```bash
pnpm typecheck
pnpm test
pnpm demo:validate
pnpm project:status
```

Optional explicit-path checks:

```bash
node --experimental-strip-types src/index.ts examples/demo-v1-roles/brief.md outputs/demo-v1-roles
node --experimental-strip-types src/importPo.ts examples/demo-v1-roles/po-pm-response.json outputs/demo-v1-roles
node --experimental-strip-types src/promptSpecialists.ts outputs/demo-v1-roles/exported-items/manifest.json outputs/demo-v1-roles/specialist-prompts
node --experimental-strip-types src/specialistCheck.ts examples/specialist-responses/frontend-story-002.md outputs/demo-v1-roles/specialist-check
node --experimental-strip-types src/projectStatus.ts outputs/demo-v1-roles
```

V1 should be considered ready only when:

- the command sequence above succeeds locally
- the generated outputs remain human-reviewable
- the boundaries in [MVP.md](./MVP.md), [MANUAL_WORKFLOW.md](./MANUAL_WORKFLOW.md), and [ROADMAP.md](./ROADMAP.md) still describe the real behavior of the repository
- maintainers agree that manual approval remains explicit at every important transition
