# Adopt ADE in an Existing Project

This is a small, runnable example of adding AI Delivery Engine (ADE) to an
existing Node.js project. It intentionally contains no AI-provider settings or
secrets: the first pass only creates project context and runs deterministic
review rules.

## Run it

From this directory, using Node.js 22 or later:

```bash
npm install
npm run ade:check
npm run ade:context
npm run ade:review
```

The commands use the published `@alelouet/ai-delivery-engine` package. They
validate the checked-in `ade.config.json`, generate `outputs/context/`, then
review this small project. Generated output is ignored by Git.

## Use the same flow in your project

At the root of an existing project, run:

```bash
npm install -D @alelouet/ai-delivery-engine
npx ade init
npx ade config validate
npx ade context generate
npx ade review
```

`ade init` creates the same kind of `ade.config.json` as this example. Adapt
the `ignore`, `sensitive`, and `tools` values to your repository before sharing
the configuration with the team. Do not add API keys or other secrets to this
file.

## What to inspect

- `ade.config.json` is the local policy for inputs, sensitive paths, and
  generated context.
- `src/releaseChecklist.ts` is a deliberately small source file that represents
  application code included in the local review scope.
- `outputs/context/context.md` and `outputs/context/context.json` are the
  generated, reviewable project map.

For rule packs, CI use, and the complete command reference, continue with the
[Getting Started guide](../../docs/GETTING_STARTED.md) and the
[CLI reference](../../docs/CLI.md).
