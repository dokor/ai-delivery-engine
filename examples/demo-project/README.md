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

## 6. Check Project Status

```bash
node --experimental-strip-types src/projectStatus.ts outputs/demo-project
```

This prints a local status summary and writes:

- `outputs/demo-project/project-status.json`

## Optional Shortcuts

These commands exist, but they use the repository default sample files rather than this demo fixture:

- `pnpm backlog:run`
- `pnpm prompt:po`
- `pnpm import:po`
- `pnpm backlog:review`
- `pnpm backlog:export`
- `pnpm project:status`
