/**
 * Indicative token estimation.
 *
 * ADE is provider-agnostic and never calls a tokenizer, so token counts are a
 * deterministic heuristic — roughly four characters per token for typical
 * source and prose. Estimates are always labelled indicative in the manifest;
 * they exist to compare and budget packs, not to bill against a provider.
 */
export const CHARS_PER_TOKEN = 4;

export const ESTIMATE_METHOD = 'heuristic-chars-per-token';

export function estimateTokens(text: string): number {
  if (text.length === 0) {
    return 0;
  }
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}
