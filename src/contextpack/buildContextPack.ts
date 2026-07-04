import { isIgnored } from '../context/ignoreMatcher.ts';
import { ESTIMATE_METHOD, estimateTokens } from './estimateTokens.ts';
import type {
  BuildContextPackOptions,
  ContextItem,
  ContextItemKind,
  ContextManifest,
  ContextPack,
  ManifestExcludedEntry,
  ManifestIncludedEntry
} from './contextPack.types.ts';

const SCHEMA_VERSION = 1;

/** Default keep-priority by kind (higher survives budget pressure longer). */
const DEFAULT_PRIORITY: Record<ContextItemKind, number> = {
  diff: 100,
  context: 80,
  rules: 60,
  fragment: 40,
  docs: 20
};

const DEFAULT_REASON: Record<ContextItemKind, string> = {
  diff: 'changed files in scope',
  context: 'project/module context',
  rules: 'applicable rules',
  fragment: 'neighbouring code fragment',
  docs: 'related documentation'
};

interface ItemMeta {
  item: ContextItem;
  tokens: number;
  priority: number;
}

function renderItem(item: ContextItem): string {
  return `## [${item.kind}] ${item.ref}\n\n${item.content.replace(/\s+$/, '')}`;
}

/**
 * Assembles a context pack from candidate items under a token budget, fully
 * deterministically:
 *
 * 1. exclude sensitive items (path matches a sensitive glob) — fail-safe;
 * 2. estimate tokens per item (indicative);
 * 3. while over budget, drop the lowest-priority non-required item (largest
 *    first on ties), recording every drop in `reductionsApplied`;
 * 4. if required items still exceed the budget, keep them and flag `overBudget`
 *    — never a silent truncation.
 *
 * Content is emitted in a stable order (priority desc, then ref) so an
 * unchanged input yields byte-identical output.
 */
export function buildContextPack(
  items: ContextItem[],
  options: BuildContextPackOptions
): ContextPack {
  const excluded: ManifestExcludedEntry[] = [];
  const sensitivePatterns = options.sensitivePatterns ?? [];

  const surviving: ItemMeta[] = [];
  for (const item of items) {
    if (item.path && isIgnored(item.path, sensitivePatterns)) {
      excluded.push({ kind: item.kind, ref: item.ref, reason: 'sensitive' });
      continue;
    }
    surviving.push({
      item,
      tokens: estimateTokens(item.content),
      priority: item.priority ?? DEFAULT_PRIORITY[item.kind]
    });
  }

  const reductionsApplied: string[] = [];
  const dropped = new Set<ItemMeta>();
  let total = surviving.reduce((sum, meta) => sum + meta.tokens, 0);

  while (total > options.budget) {
    const candidates = surviving.filter((meta) => !meta.item.required && !dropped.has(meta));
    if (candidates.length === 0) {
      break;
    }
    candidates.sort((left, right) => left.priority - right.priority || right.tokens - left.tokens);
    const victim = candidates[0];
    dropped.add(victim);
    total -= victim.tokens;
    excluded.push({
      kind: victim.item.kind,
      ref: victim.item.ref,
      reason: `dropped-to-fit-budget (${options.mode})`
    });
    reductionsApplied.push(`dropped ${victim.item.kind}:${victim.item.ref}`);
  }

  const overBudget = total > options.budget;
  if (overBudget) {
    reductionsApplied.push(
      `over-budget: required items total ${total} tokens exceed budget ${options.budget}`
    );
  }

  const includedMeta = surviving
    .filter((meta) => !dropped.has(meta))
    .sort((left, right) => right.priority - left.priority || left.item.ref.localeCompare(right.item.ref));

  const included: ManifestIncludedEntry[] = includedMeta.map((meta) => ({
    kind: meta.item.kind,
    ref: meta.item.ref,
    estimatedTokens: meta.tokens,
    reason: meta.item.reason ?? DEFAULT_REASON[meta.item.kind]
  }));

  const content = includedMeta.map((meta) => renderItem(meta.item)).join('\n\n');

  const manifest: ContextManifest = {
    schemaVersion: SCHEMA_VERSION,
    mode: options.mode,
    budget: options.budget,
    estimatedTokens: total,
    estimateMethod: ESTIMATE_METHOD,
    estimateIsIndicative: true,
    overBudget,
    included,
    excluded,
    reductionsApplied,
    cacheKey: options.cacheKey ?? '',
    cacheHit: options.cacheHit ?? false
  };

  return { content, manifest };
}
