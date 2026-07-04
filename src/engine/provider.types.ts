import type { ContextPack } from '../contextpack/contextPack.types.ts';
import type { Finding } from './findings.types.ts';

/**
 * Optional AI-provider adapter contract.
 *
 * ADE never calls a provider implicitly and ships no adapter by default. This
 * interface lets an adapter be added later (OpenAI, Anthropic, GitHub Models, a
 * local/Ollama model, or an MCP client) **without changing the base commands**:
 * `ade review --provider <name>` prepares a review pack (a context pack) and,
 * if an adapter is registered, hands it the pack to produce provider-origin
 * findings. With no adapter registered, ADE only writes the prepared pack — no
 * key required, no code leaves the machine.
 */
export interface ProviderReviewInput {
  /** The prepared, budgeted context pack for the review. */
  pack: ContextPack;
  /** Provider name requested on the CLI. */
  provider: string;
}

export interface ProviderAdapter {
  name: string;
  /** Produces provider-origin findings from a prepared pack. */
  reviewFromPack(input: ProviderReviewInput): Promise<Finding[]>;
}

/** Registry of provider adapters. Empty by default (local-first). */
const REGISTRY = new Map<string, ProviderAdapter>();

export function registerProviderAdapter(adapter: ProviderAdapter): void {
  REGISTRY.set(adapter.name, adapter);
}

export function getProviderAdapter(name: string): ProviderAdapter | undefined {
  return REGISTRY.get(name);
}
