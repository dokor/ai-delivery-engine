# Demo V1 Roles Fixture

This fixture shows a compact local workflow that exercises all current V1 core backlog owner roles.

Files:

- `examples/demo-v1-roles/brief.md`
- `examples/demo-v1-roles/po-pm-response.json`

Use `outputs/demo-v1-roles/` as the local working directory for generated artifacts.

## Covered V1 Owner Roles

The fixture backlog includes representative items for:

- `po_pm`
- `ux_ui`
- `frontend`
- `backend`
- `qa`
- `tech_lead`
- `legal_compliance`
- `security`
- `devops`
- `data_analytics`
- `customer_success`

## 1. Generate A Deterministic Backlog Draft

```bash
node --experimental-strip-types src/index.ts examples/demo-v1-roles/brief.md outputs/demo-v1-roles
```

## 2. Generate The PO/PM Manual Prompt

```bash
node --experimental-strip-types src/promptPo.ts examples/demo-v1-roles/brief.md outputs/demo-v1-roles
```

## 3. Import The Fixture PO/PM Response

```bash
node --experimental-strip-types src/importPo.ts examples/demo-v1-roles/po-pm-response.json outputs/demo-v1-roles
```

This writes:

- `outputs/demo-v1-roles/po-pm-response.normalized.backlog.json`
- `outputs/demo-v1-roles/po-pm-response.normalized.backlog.md`

## 4. Review The Backlog

```bash
node --experimental-strip-types src/reviewBacklog.ts outputs/demo-v1-roles/po-pm-response.normalized.backlog.json outputs/demo-v1-roles
```

This writes:

- `outputs/demo-v1-roles/backlog-review.md`
- `outputs/demo-v1-roles/backlog-review.json`

## 5. Export Backlog Items

```bash
node --experimental-strip-types src/exportBacklog.ts outputs/demo-v1-roles/po-pm-response.normalized.backlog.json outputs/demo-v1-roles/exported-items
```

This writes:

- one Markdown file per backlog item under `outputs/demo-v1-roles/exported-items/`
- `outputs/demo-v1-roles/exported-items/manifest.json`

## 6. Generate Batch Specialist Prompts

```bash
node --experimental-strip-types src/promptSpecialists.ts outputs/demo-v1-roles/exported-items/manifest.json outputs/demo-v1-roles/specialist-prompts
```

This writes:

- one prompt file per supported non-PO/PM owner role under `outputs/demo-v1-roles/specialist-prompts/`
- `outputs/demo-v1-roles/specialist-prompts/index.json`
- `outputs/demo-v1-roles/specialist-prompts/README.md`

## 7. Check Project Status

```bash
node --experimental-strip-types src/projectStatus.ts outputs/demo-v1-roles
```

This prints a local status summary and writes:

- `outputs/demo-v1-roles/project-status.json`

## Notes

- `pnpm prompt:specialists` can now generate prompts for every supported V1 specialist role present in this fixture.
- `po_pm` items remain intentionally skipped by the batch specialist prompt command because that flow is meant for downstream specialist review.
