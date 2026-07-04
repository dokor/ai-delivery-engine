/**
 * Types for the ADE context pack: the minimal, purpose-built bundle assembled
 * before a single LLM interaction. ADE never calls a provider itself — the pack
 * and its manifest are produced deterministically and locally so a human or CI
 * can see exactly what would be sent, why, and how to reduce it further.
 */

export type ContextItemKind = 'diff' | 'context' | 'rules' | 'fragment' | 'docs';

/** A candidate piece of context the builder may include or drop. */
export interface ContextItem {
  kind: ContextItemKind;
  /** Stable identifier/label (used for ordering, manifest and cache key). */
  ref: string;
  /** The textual content that would be sent. */
  content: string;
  /** Why this item is relevant (surfaced in the manifest). */
  reason?: string;
  /** Source path, when applicable — used to exclude sensitive files. */
  path?: string;
  /** Required items are never dropped by budget reduction (e.g. the diff). */
  required?: boolean;
  /** Higher priority is kept longer under budget pressure. Defaults by kind. */
  priority?: number;
}

export interface ManifestIncludedEntry {
  kind: ContextItemKind;
  ref: string;
  estimatedTokens: number;
  reason: string;
}

export interface ManifestExcludedEntry {
  kind: ContextItemKind;
  ref: string;
  reason: string;
}

/**
 * Transparent description of an assembled pack. `estimatedTokens` is always
 * indicative (`estimateIsIndicative: true`); ADE never claims an exact provider
 * token count. Every reduction is recorded in `reductionsApplied` so context is
 * never trimmed silently.
 */
export interface ContextManifest {
  schemaVersion: number;
  mode: string;
  budget: number;
  estimatedTokens: number;
  estimateMethod: string;
  estimateIsIndicative: true;
  overBudget: boolean;
  included: ManifestIncludedEntry[];
  excluded: ManifestExcludedEntry[];
  reductionsApplied: string[];
  cacheKey: string;
  cacheHit: boolean;
}

export interface ContextPack {
  content: string;
  manifest: ContextManifest;
}

export interface BuildContextPackOptions {
  mode: string;
  budget: number;
  /** Globs whose matching items are excluded as sensitive. */
  sensitivePatterns?: string[];
  cacheKey?: string;
  cacheHit?: boolean;
}
