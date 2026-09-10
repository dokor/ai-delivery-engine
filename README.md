# AI Delivery Engine

**AI Delivery Engine (ADE)** helps a software team turn AI-assisted work into a delivery process that can be reviewed, validated, and approved by people.

It gives your repository a shared way to prepare work, give an AI coding agent the right context, run deterministic checks, and keep the final delivery decisions with humans. ADE is local-first and provider-neutral: it works with the coding client you choose, and never calls an AI provider by itself.

[View the package on npm](https://www.npmjs.com/package/@alelouet/ai-delivery-engine) · [Try the adoption example](examples/adopt-existing-project/README.md) · [See how adoption is measured](docs/NPM_ADOPTION.md)

## The problem it solves

AI tools are good at individual tasks, but a software change still needs a clear scope, relevant context, validation, review, and a human decision before it is merged. Without a shared process, teams often end up with disconnected prompts, unclear handoffs, and changes that are hard to audit.

ADE makes those handoffs explicit. It can help you:

- set up a repository with an ADE configuration and an up-to-date project context;
- review a codebase or staged changes with deterministic rules;
- turn a brief into a reviewable backlog through a local, human-controlled workflow;
- plan GitHub work into a validated implementation handoff before coding begins;
- define the validation and specialist-review steps that must happen before a pull request is ready for human review.

ADE is not an autonomous delivery platform. It does not silently contact an AI model, create remote resources on its own, or merge pull requests. Those boundaries are deliberate.

## How it fits into delivery

Use ADE at the point where an idea becomes a change that someone can confidently review:

```text
Brief or GitHub issue
        ↓
ADE clarifies the scope and prepares the delivery context
        ↓
Validated implementation handoff
        ↓
Your coding agent implements the admitted work
        ↓
Deterministic validation and specialist reviews
        ↓
Pull request → explicit human review and merge
```

The coding provider can be Codex, Claude Code, Cursor, or another compatible client. The delivery rules, validation expectations, and human approval gates stay the same.

## Try it quickly

### Add ADE to an existing project

From the root of a project running Node.js 22 or later:

```bash
npm install -D @alelouet/ai-delivery-engine
npx ade init
npx ade context generate
npx ade review
```

This creates the local ADE configuration, maps the project into generated context files, then runs the configured deterministic review. No API key or AI provider is needed.

Next, inspect and tailor `ade.config.json` for your stack (rule packs, paths to ignore, and paths that must remain sensitive). Then use `npx ade doctor` to check the local setup or `npx ade review --staged` before a commit.

For an annotated, copyable walkthrough using a small existing project, see the [adoption example](examples/adopt-existing-project/README.md). For installation options, configuration details, and every CLI command, see the [Getting Started guide](docs/GETTING_STARTED.md) and [CLI reference](docs/CLI.md).

### Run the built-in demo from source

If you want to see the brief-to-backlog workflow end to end, clone this repository and run:

```bash
pnpm install
pnpm demo:validate
```

The demo takes a sample brief through backlog generation, PO/PM-response import, backlog review, item export, specialist-prompt generation, and local validation. Its inputs and generated artifacts are documented in the [demo guide](examples/demo-project/README.md).

## Choose your starting point

| If you want to… | Start here |
| --- | --- |
| Add deterministic context and review to a codebase | [Getting Started](docs/GETTING_STARTED.md) |
| Understand or configure an `ade` command | [CLI reference](docs/CLI.md) |
| Turn a brief into a reviewed delivery backlog | [Manual workflow](docs/MANUAL_WORKFLOW.md) |
| Use a client such as Codex or Claude through MCP | [MCP integration](docs/MCP.md) |
| Plan and deliver work from GitHub issues | [GitHub workflow](docs/GITHUB_WORKFLOW.md) |
| Understand the roles, review points, and human gates | [Workflow](docs/WORKFLOW.md) and [role handoffs](docs/V1_ROLE_HANDOFFS.md) |
| See a minimal project configured for ADE | [Adoption example](examples/adopt-existing-project/README.md) |

## What to do next

1. **Adopt ADE in one repository.** Start with `ade init`, generate the project context, and run a review. Keep the first configuration small and adjust it as you learn what your project needs.
2. **Make the delivery policy visible.** Keep the root [`AGENTS.md`](AGENTS.md) in the repository so every coding agent receives the same readiness, validation, and publication rules.
3. **Use explicit handoffs for implementation.** A GitHub issue or work request is planned first; only a development-ready handoff defines the scope a coding agent should implement.
4. **Keep humans at the gates.** Review generated artifacts, decide what is ready, and merge pull requests explicitly. ADE supports those decisions; it does not replace them.

## Key concepts and boundaries

- **Local-first:** configuration, context, checks, and generated artifacts stay in your project. ADE does not make implicit network or model calls.
- **Provider-neutral:** switch coding clients without changing your repository's delivery semantics.
- **Deterministic by default:** the CLI can inspect configuration, generate context, and run rules without asking a model to make a decision.
- **Human-controlled:** people approve important transitions, including readiness for implementation and pull-request merge.
- **Documentation-first:** ADE uses clear contracts and reviewable files before adding automation.

For the product rationale and longer-term direction, see the [vision](docs/VISION.md), [architecture](docs/ARCHITECTURE.md), and [roadmap](docs/ROADMAP.md).

## Contributing

This repository uses ADE itself. Before changing implementation code, read [`AGENTS.md`](AGENTS.md); it defines the required delivery gates and validation commands. At minimum, run:

```bash
pnpm typecheck
pnpm test
```

For the complete project setup contract and GitHub delivery details, see [Project setup contract](docs/PROJECT_SETUP_CONTRACT.md) and [GitHub workflow](docs/GITHUB_WORKFLOW.md).
