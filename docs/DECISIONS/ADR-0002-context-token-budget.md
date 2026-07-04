# ADR-0002: Context Token Budgeting And Reusable Context Packs

## Status

Proposed

Decided as the strategy for [issue #102](https://github.com/dokor/ai-delivery-engine/issues/102). Implementation is intentionally deferred and gated on its dependencies (see [Follow-Up](#follow-up)). This ADR satisfies the "mandatory study before implementation" gate of that issue: it compares viable approaches and selects one before any runtime code is written.

## Context

An ADE workflow becomes expensive — and often *lower quality* — when it re-sends the same material to an LLM on every step: the full project description, long rule sets, whole documents, an exhaustive file tree, unchanged files, and oversized conversation history.

Two risks follow:

- **Cost**: needless spend for whoever owns the provider account.
- **Quality**: reasoning degrades when the model receives a bloated, noisy context.

ADE must therefore treat *context efficiency* as a first-class runtime and artifact-format concern from the start, even though LLM calls stay optional and provider-agnostic in V1.

This ADR must honour the non-negotiable V1 constraints from issue #102:

- no implicit LLM calls;
- no secrets or sensitive files inside context packs;
- local ADE operation must remain possible without any provider;
- token estimates are indicative and must be labelled as such;
- no silent quality degradation — every reduction must be observable.

### Terminology

- **Context pack**: the minimal, purpose-built bundle of material assembled *before* a single LLM interaction.
- **Manifest**: a machine-readable description of a context pack — what was included, what was excluded and why, the token budget, the (indicative) token estimate, and a cache key.
- **Budget**: an explicit maximum token allowance for a context pack, configurable per role / profile / provider.
- **Reduction ladder**: the ordered, deterministic strategy applied to shrink a pack until it fits its budget.

## Options Considered

The issue proposes a targeted incremental context pack as a *working hypothesis*, not a final decision. We evaluated the following viable options. They are not mutually exclusive; the decision layers several of them.

### Option A — Targeted context pack (diff + rules + fragments) with an explicit budget

Assemble each pack from the diff/targeted files, the rules that actually apply (by profile, paths, stack, file types), a compact module summary, and 2–5 neighbouring code fragments, bounded by a token budget with a progressive reduction ladder.

- **Cost**: high reduction — only relevant material is sent.
- **Quality**: high — focused context improves reasoning; risk is over-pruning a needed fragment.
- **Complexity**: medium — needs relevance selection + budgeting + a manifest.
- **Privacy**: strong — inclusion is explicit and auditable, easy to enforce exclusions.
- **Maintainability**: good — deterministic, testable, provider-agnostic.

### Option B — Stable cache keyed by project/config fingerprint

Cache reusable, stable context (compact project summary, hierarchical module summaries) under a fingerprint of the sources + rules + config, and reuse it across steps and runs until an input changes.

- **Cost**: high reduction on *repeat* work; little help on a first, cold run.
- **Quality**: neutral to positive (consistent context); stale cache is the main risk.
- **Complexity**: medium — needs fingerprinting and correct invalidation.
- **Privacy**: neutral — cache files must live under `outputs/` and respect the same exclusions.
- **Maintainability**: good if invalidation is strict; a silent stale cache is the failure mode.

### Option C — On-demand retrieval via tools / MCP instead of prompt injection

Rather than injecting material into the prompt, expose it through tools/MCP so the model pulls only what it needs.

- **Cost**: potentially high reduction; can add round-trips.
- **Quality**: high when retrieval is good; depends on an agent runtime that can call tools.
- **Complexity**: high for V1 — needs a tool/agent runtime that does not exist yet (see #82 MCP, #79 CLI).
- **Privacy**: needs careful tool-level guards to avoid exposing sensitive files.
- **Maintainability**: higher surface area; premature while V1 stays manual/provider-optional.

### Option D — Workflow decomposition into smaller steps with structured outputs

Split a large workflow into smaller steps, each with a narrow input and a structured output, so no single step needs the whole context.

- **Cost**: high reduction — each step carries only its slice.
- **Quality**: high — smaller, well-scoped tasks reason better.
- **Complexity**: medium — mostly a workflow/design concern, complements A.
- **Privacy**: neutral.
- **Maintainability**: good — aligns with the existing file-based, checkpoint-per-command style.

### Option E — Document compression / normalisation

Compress or normalise documents (strip boilerplate, summarise) before inclusion.

- **Cost**: medium reduction.
- **Quality**: risky — lossy compression can drop the one detail that mattered; hard to make observable.
- **Complexity**: medium.
- **Privacy**: neutral.
- **Maintainability**: weaker — quality loss is hard to bound deterministically.

### Comparison Summary

Legend: ▲ strong / ● medium / ▽ weak-or-risky. Cost = expected token reduction.

| Option | Cost | Quality | Complexity (lower is better) | Privacy | Maintainability | V1 fit |
|---|---|---|---|---|---|---|
| A — Targeted pack + budget | ▲ | ▲ | ● | ▲ | ▲ | ▲ |
| B — Fingerprint cache | ▲ (repeat) | ● | ● | ● | ● | ▲ |
| C — On-demand retrieval (tools/MCP) | ▲ | ▲ | ▽ (high) | ● | ● | ▽ (needs runtime) |
| D — Workflow decomposition | ▲ | ▲ | ● | ● | ▲ | ▲ |
| E — Document compression | ● | ▽ | ● | ● | ▽ | ▽ |

## Decision

Adopt a **layered strategy built on a deterministic, provider-agnostic context-pack builder (Option A) as the core**, composed with a **fingerprint-keyed cache for stable artifacts (Option B)** and framed by **workflow decomposition (Option D)** as a design principle.

**On-demand retrieval (C)** is explicitly deferred until an agent/MCP runtime exists (#82). **Document compression (E)** is rejected for V1 as a default because its quality loss is hard to bound observably; targeted *exclusion* is preferred over lossy compression.

Rationale: A + B + D deliver the largest cost reduction with the strongest quality and privacy guarantees, stay fully functional without a provider, and are deterministic and testable — matching ADE's local-first, documentation-first posture ([ADR-0001](./ADR-0001-documentation-first.md)). C and E add cost or risk that V1 cannot yet justify.

### Core contract 1 — The context-pack manifest

Every context pack is described by a manifest so a human or CI can see what was included, why, and how to reduce cost further. Proposed shape (extends the example in issue #102):

```json
{
  "schemaVersion": 1,
  "budget": 12000,
  "estimatedTokens": 8400,
  "estimateMethod": "heuristic-chars-per-token",
  "estimateIsIndicative": true,
  "role": "backend",
  "provider": null,
  "included": [
    { "kind": "diff", "ref": "PR#123", "estimatedTokens": 3200, "reason": "changed files in scope" },
    { "kind": "rules", "ref": "rules:next", "estimatedTokens": 1200, "reason": "stack=next, paths match" },
    { "kind": "context", "ref": "context:module:auth", "estimatedTokens": 2600, "reason": "compact module summary" },
    { "kind": "fragments", "ref": "fragments:3", "estimatedTokens": 1400, "reason": "imported symbols used by the diff" }
  ],
  "excluded": [
    { "kind": "docs", "ref": "docs:unrelated", "reason": "not applicable to changed paths" },
    { "kind": "files", "ref": "files:unchanged", "reason": "unchanged, out of scope" },
    { "kind": "rules", "ref": "rules:python", "reason": "stack mismatch" }
  ],
  "reductionsApplied": ["dropped-unrelated-docs", "capped-fragments-to-3"],
  "cacheKey": "sha256:...",
  "cacheHit": false
}
```

Design rules:

- `estimatedTokens` is **indicative** and always paired with `estimateIsIndicative: true` and an `estimateMethod`; the manifest never claims an exact provider token count.
- Every `included` and `excluded` entry carries a machine-usable `reason` so inclusion is **justifiable and traceable**.
- The manifest is the observable surface that prevents *silent* degradation: any reduction appears in `reductionsApplied`.
- Manifests are written under `outputs/` alongside other V1 artifacts, consistent with the existing manifest pattern (`exported-items/manifest.json`).

### Core contract 2 — Budgeting and the reduction ladder

- A pack has an explicit `budget` (max tokens), configurable per role / profile / provider (defaults live in ADE config, #83).
- If `estimatedTokens > budget`, apply a **deterministic reduction ladder**, recording each step in `reductionsApplied`, in this priority order (most-droppable first):
  1. drop non-applicable rules and unrelated docs;
  2. drop unchanged / out-of-scope files;
  3. cap neighbouring fragments (e.g. 5 → 3 → 1), ranked by dependency/symbol relevance to the diff;
  4. replace full module context with its compact summary;
  5. if still over budget, **stop and surface an explicit over-budget warning** rather than silently truncating mid-artifact.
- Over-budget is an **observable outcome**, never a silent trim. The workflow (or CI) can then decide to raise the budget, narrow the scope, or split the step (Option D).

### Core contract 3 — Sensitive-content exclusion

- A deny-list policy (globs + content heuristics for secrets/keys/`.env`/credentials) runs **before** assembly; matched content is excluded and appears in `excluded` with reason `sensitive`.
- Exclusion is fail-safe: on doubt, exclude. This is enforced by tests (see acceptance criteria).

### Core contract 4 — Cache and invalidation (Option B)

- Stable artifacts (compact project summary, hierarchical module summaries) are cached under `outputs/` keyed by a `cacheKey` = fingerprint of: relevant source files + applicable rules + ADE config + tool version.
- The cache is invalidated when **any** fingerprint input changes: config, rules, or the relevant sources. `cacheHit` is recorded in the manifest for auditability.
- A stale-cache read must be impossible by construction: the key changes whenever a tracked input changes.

## Consequences

Positive:

- Large, measurable token reduction with an auditable manifest.
- Quality protected by focus + observable reductions (no silent loss).
- Strong privacy posture (explicit inclusion, fail-safe exclusion).
- Fully local-first: works with `provider: null`; the pack + manifest are useful even when no LLM is called.
- Deterministic and testable, consistent with existing `node:test` + file-artifact conventions.

Trade-offs:

- Up-front design of relevance selection, budgeting, and fingerprinting before any token is saved.
- Token estimates are approximate by design; the manifest must communicate this honestly.
- On-demand retrieval (C) and compression (E) benefits are postponed.

## Acceptance-Criteria Mapping

How this ADR and its planned follow-up satisfy issue #102:

- [x] **A decision note compares ≥3 viable approaches before implementation** — this ADR (Options A–E).
- [x] **A strategy is chosen with cost/quality/complexity metrics** — see Comparison Summary + Decision (A+B+D).
- [ ] **Context manifest with included/excluded + budget estimate** — specified here (Core contract 1); implemented in follow-up.
- [ ] **Workflow context bounded by a configurable budget** — specified (Core contract 2); implemented in follow-up.
- [ ] **Included rules/files are justifiable and traceable** — specified (`reason` per entry); implemented in follow-up.
- [ ] **Cache invalidated on config/rules/source change** — specified (Core contract 4); implemented in follow-up.
- [ ] **Tests: filtering, sensitive exclusion, over-budget, cache invalidation** — planned in follow-up (aligned with #99).
- [ ] **Docs: how to measure and tune token consumption** — planned in follow-up (user guide once the builder exists).

## Follow-Up

Implementation is deferred until its dependencies are merged, because the runtime must plug into them rather than duplicate them:

- **#79 CLI** — the context-pack builder should surface as an `ade` subcommand.
- **#83 Configuration** — budgets, deny-list, and rule selection live in validated ADE config.
- **#84 Project context** — the compact project/module summaries consumed by the pack.
- **#99 Critical-path tests** — the test harness the new tests will extend.

Recommended decomposition of the implementation (each a separate, dependency-gated issue, per the >3-day split rule):

1. **Context-pack builder core** — pure module producing a manifest from provided inputs (diff, rules, fragments) with a token estimator; no CLI, no provider. Tests: filtering + sensitive exclusion + manifest shape.
2. **Budget + reduction ladder** — configurable budgets and the deterministic reduction ladder with observable over-budget outcome. Tests: over-budget behaviour.
3. **Fingerprint cache + invalidation** — stable-artifact cache under `outputs/`. Tests: invalidation on config/rules/source change.
4. **CLI surface + user guide** — `ade` subcommand and documentation on measuring and tuning token consumption.

Until these land, ADE keeps operating exactly as today, with no implicit LLM calls and no behavioural change.
