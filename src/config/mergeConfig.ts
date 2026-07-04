import type {
  AdeConfig,
  AdeRule,
  ConfigProvenanceEntry,
  ResolvedAdeConfig
} from './config.types.ts';

/** Returns a fresh resolved config with empty defaults. */
export function emptyResolvedConfig(): ResolvedAdeConfig {
  return {
    ignore: [],
    sensitive: [],
    tools: [],
    rules: [],
    profiles: {},
    context: {},
    thresholds: {},
    output: {}
  };
}

/** Union of two string arrays preserving first-seen order. */
function unionStrings(base: string[], incoming: string[]): string[] {
  const seen = new Set(base);
  const result = [...base];
  for (const value of incoming) {
    if (!seen.has(value)) {
      seen.add(value);
      result.push(value);
    }
  }
  return result;
}

/** Merge incoming rules into base by `id` (same id overrides), appending new ones. */
function mergeRules(base: AdeRule[], incoming: AdeRule[]): AdeRule[] {
  const result = base.map((rule) => ({ ...rule }));
  const indexById = new Map(result.map((rule, index) => [rule.id, index]));

  for (const rule of incoming) {
    const existingIndex = indexById.get(rule.id);
    if (existingIndex === undefined) {
      indexById.set(rule.id, result.length);
      result.push({ ...rule });
    } else {
      result[existingIndex] = { ...result[existingIndex], ...rule };
    }
  }

  return result;
}

/** Records that `sourceLabel` contributed `key`, keeping source order. */
function recordProvenance(
  provenance: Map<string, string[]>,
  key: string,
  sourceLabel: string
): void {
  const sources = provenance.get(key) ?? [];
  if (!sources.includes(sourceLabel)) {
    sources.push(sourceLabel);
  }
  provenance.set(key, sources);
}

/**
 * Deterministically merges one user config layer into an accumulator, recording
 * provenance per touched key. Presets are merged before the root config so the
 * root always wins on scalar conflicts. Arrays of ignore/sensitive/tools are
 * unioned; rules merge by id; profiles/thresholds merge per key; context and
 * output merge per field with later layers winning.
 */
export function mergeConfigLayer(
  accumulator: ResolvedAdeConfig,
  layer: AdeConfig,
  sourceLabel: string,
  provenance: Map<string, string[]>
): void {
  if (layer.ignore !== undefined) {
    accumulator.ignore = unionStrings(accumulator.ignore, layer.ignore);
    recordProvenance(provenance, 'ignore', sourceLabel);
  }

  if (layer.sensitive !== undefined) {
    accumulator.sensitive = unionStrings(accumulator.sensitive, layer.sensitive);
    recordProvenance(provenance, 'sensitive', sourceLabel);
  }

  if (layer.tools !== undefined) {
    accumulator.tools = unionStrings(accumulator.tools, layer.tools);
    recordProvenance(provenance, 'tools', sourceLabel);
  }

  if (layer.rules !== undefined) {
    accumulator.rules = mergeRules(accumulator.rules, layer.rules);
    recordProvenance(provenance, 'rules', sourceLabel);
    for (const rule of layer.rules) {
      recordProvenance(provenance, `rules.${rule.id}`, sourceLabel);
    }
  }

  if (layer.profiles !== undefined) {
    for (const [name, profile] of Object.entries(layer.profiles)) {
      accumulator.profiles[name] = { ...accumulator.profiles[name], ...profile };
      recordProvenance(provenance, `profiles.${name}`, sourceLabel);
    }
  }

  if (layer.context !== undefined) {
    accumulator.context = { ...accumulator.context, ...layer.context };
    recordProvenance(provenance, 'context', sourceLabel);
  }

  if (layer.thresholds !== undefined) {
    accumulator.thresholds = { ...accumulator.thresholds, ...layer.thresholds };
    recordProvenance(provenance, 'thresholds', sourceLabel);
  }

  if (layer.output !== undefined) {
    accumulator.output = { ...accumulator.output, ...layer.output };
    recordProvenance(provenance, 'output', sourceLabel);
  }
}

/** Converts a provenance map into a stable, sorted array. */
export function provenanceToArray(provenance: Map<string, string[]>): ConfigProvenanceEntry[] {
  return [...provenance.entries()]
    .map(([key, sources]) => ({ key, sources }))
    .sort((left, right) => left.key.localeCompare(right.key));
}
