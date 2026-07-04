# Measuring And Tuning LLM Token Consumption

ADE never calls an LLM itself, but it prepares the context a provider would
receive. This guide explains how to **measure** what a context pack would cost,
how to **choose a mode**, and how to **tune** individual levers — all locally,
deterministically, and without any provider.

Related: [MANUAL_WORKFLOW.md](./MANUAL_WORKFLOW.md), [V1_CRITICAL_PATH.md](./V1_CRITICAL_PATH.md).

## The context pack

Before a single LLM interaction, ADE assembles a **context pack**: the minimal,
purpose-built bundle of material for that step. Instead of re-sending the whole
repository on every call, a pack contains only what is relevant — the diff, the
applicable rules, a compact project/module context, and (in richer modes)
neighbouring fragments and related docs.

```bash
pnpm context:pack [mode] [diffFile]
# or: ade context:pack [mode] [diffFile]
```

- `mode` — `chill`, `normal` (default) or `expert`.
- `diffFile` — optional path (inside the project) to a diff / changed-files
  summary; it is treated as a **required** item and never dropped.

It writes two artifacts under the context output directory (default
`outputs/context/`):

- `context-pack.md` — the assembled pack (what would be sent);
- `context-pack.manifest.json` — the transparent manifest (below).

## Reading the manifest

The manifest is the observable surface that prevents silent, costly, or
lossy behaviour:

```json
{
  "mode": "normal",
  "budget": 12000,
  "estimatedTokens": 8400,
  "estimateMethod": "heuristic-chars-per-token",
  "estimateIsIndicative": true,
  "overBudget": false,
  "included": [{ "kind": "diff", "estimatedTokens": 3200, "reason": "changed files in scope" }],
  "excluded": [{ "kind": "docs", "reason": "dropped-to-fit-budget (normal)" }],
  "reductionsApplied": ["dropped docs:docs:adrs"],
  "cacheKey": "sha256:...",
  "cacheHit": false
}
```

- **`estimatedTokens` is indicative.** ADE uses a deterministic heuristic
  (~4 characters per token), not a provider tokenizer. Use it to compare and
  budget packs, not to bill against a provider.
- **`included` / `excluded`** — every item carries a machine-usable `reason`, so
  what is sent (and what is cut) is always justifiable and traceable.
- **`reductionsApplied`** — the ordered list of what was dropped to fit the
  budget. Nothing is ever trimmed silently.
- **`overBudget: true`** — required items alone exceed the budget. ADE keeps them
  and flags this instead of truncating; narrow the scope or raise the budget.
- **`cacheHit`** — whether the pack was reused from cache (see below).

## Choosing a mode

Modes are a single knob trading **token cost** for **precision**. More context
means more precise reasoning but more tokens.

| Lever | 🟢 chill | 🔵 normal | 🔴 expert |
|---|---|---|---|
| Token budget | ~4k | ~12k | ~32k |
| Change scope | changed hunks | changed files | + direct dependents |
| Project/module context | compact project summary | compact module summary | full module context |
| Neighbour fragments | 0 | up to 5 | up to 20 |
| Rules | applicable, summarized | applicable, full | applicable + related |
| Docs / ADR | none | none | relevant |
| Over-budget behaviour | aggressive trim | moderate trim | minimal (warn) |

- **chill** — quick, cheap passes; cost-sensitive CI; low-stakes checks.
- **normal** — the everyday default.
- **expert** — hard or high-stakes reasoning where correctness beats cost.

## Tuning individual levers via config

Modes map onto `ade.config` profiles, so you can override a single lever without
abandoning a mode. A profile named after a mode overrides that mode's
`tokenBudget` and context granularity (`context: compact | full`):

```json
{
  "profiles": {
    "chill":  { "tokenBudget": 6000 },
    "normal": { "context": "full" },
    "expert": { "tokenBudget": 48000 }
  },
  "ignore": [".env*", "dist/**"],
  "sensitive": [".env*", "**/*.key"],
  "rules": [
    { "id": "next-conventions", "appliesTo": ["app/**", "pages/**"], "severity": "warn" }
  ]
}
```

Other levers that shape every pack:

- **`ignore`** — paths never inventoried into context.
- **`sensitive`** — paths whose content is **always excluded** (fail-safe); they
  appear in `excluded` with reason `sensitive` and never in the pack.
- **`rules[].appliesTo`** — scopes a rule so only relevant rules are included.

## Caching and reuse

Packs are cached by content + mode + budget + the project **fingerprint**
(sources + resolved config, from `ade context`). Rebuilding an unchanged pack is
a cache hit (`cacheHit: true`), so unchanged context is not re-assembled or
re-sent. The cache invalidates automatically: any change to the config, rules or
relevant sources changes the key and forces a fresh build — a stale pack is
impossible by construction.

## Guarantees

- No implicit LLM calls; ADE only prepares context.
- No secrets, environment values or binary content enter a pack.
- Token estimates are indicative and labelled as such.
- Every reduction is observable in the manifest — never a silent quality loss.
- Everything works locally without a provider.
