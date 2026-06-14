# Demo Project Fixture

This fixture shows the full V1 local workflow with explicit file paths.

Files:

- `examples/demo-project/brief.md`
- `examples/demo-project/po-pm-response.json`

Use `outputs/demo-project/` as the local working directory for generated artifacts.

## 1. Generate A Deterministic Backlog Draft

`pnpm backlog:run` uses the default sample brief.

For this demo fixture, run:

```bash
node --experimental-strip-types src/index.ts examples/demo-project/brief.md outputs/demo-project
```

## 2. Generate The PO/PM Manual Prompt

`pnpm prompt:po` uses the default sample brief.

For this demo fixture, run:

```bash
node --experimental-strip-types src/promptPo.ts examples/demo-project/brief.md outputs/demo-project
```

## 3. Import The Demo PO/PM Response

```bash
node --experimental-strip-types src/importPo.ts examples/demo-project/po-pm-response.json outputs/demo-project
```

This writes:

- `outputs/demo-project/po-pm-response.normalized.backlog.json`
- `outputs/demo-project/po-pm-response.normalized.backlog.md`

## 4. Run The Backlog Review

```bash
node --experimental-strip-types src/reviewBacklog.ts outputs/demo-project/po-pm-response.normalized.backlog.json outputs/demo-project
```

This writes:

- `outputs/demo-project/backlog-review.md`
- `outputs/demo-project/backlog-review.json`

## 5. Export Backlog Items

```bash
node --experimental-strip-types src/exportBacklog.ts outputs/demo-project/po-pm-response.normalized.backlog.json outputs/demo-project/exported-items
```

This writes:

- one Markdown file per backlog item under `outputs/demo-project/exported-items/`
- `outputs/demo-project/exported-items/manifest.json`

## 6. Generate Batch Specialist Prompts

```bash
node --experimental-strip-types src/promptSpecialists.ts outputs/demo-project/exported-items/manifest.json outputs/demo-project/specialist-prompts
```

This writes:

- one prompt file per supported non-PO/PM owner role under `outputs/demo-project/specialist-prompts/`
- `outputs/demo-project/specialist-prompts/index.json`
- `outputs/demo-project/specialist-prompts/README.md`

## 7. Save A Manual Specialist Response And Run The Checker

The specialist response itself is still generated manually. A practical local loop is:

```txt
specialist prompt -> manual assistant response saved as Markdown -> specialist:check -> human review
```

You can inspect example responses in [../specialist-responses/README.md](../specialist-responses/README.md).

Run a local structural check against one of those example responses:

```bash
node --experimental-strip-types src/specialistCheck.ts examples/specialist-responses/frontend-story-002.md outputs/demo-project/specialist-check
```

This writes:

- `outputs/demo-project/specialist-check/frontend-story-002.specialist-check.md`
- `outputs/demo-project/specialist-check/frontend-story-002.specialist-check.json`

The checker only validates structure and suspicious claims. It does not grade specialist quality semantically and does not approve work automatically. A human still decides whether the response is accepted, revised, or rejected.

## 8. Check Project Status

```bash
node --experimental-strip-types src/projectStatus.ts outputs/demo-project
```

This prints a local status summary and writes:

- `outputs/demo-project/project-status.json`

## 9. Validate The Full Demo Workflow

```bash
pnpm demo:validate
```

This command reruns the full explicit-path demo workflow and verifies that all expected files exist, including the normalized backlog outputs, review reports, export manifest, specialist check reports, and project status JSON.

## Optional Shortcuts

These commands exist, but they use the repository default sample files rather than this demo fixture:

- `pnpm backlog:run`
- `pnpm prompt:po`
- `pnpm import:po`
- `pnpm backlog:review`
- `pnpm backlog:export`
- `pnpm prompt:specialists`
- `pnpm specialist:check`
- `pnpm project:status`
- `pnpm demo:validate`
