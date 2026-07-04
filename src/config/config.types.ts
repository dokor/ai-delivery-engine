/**
 * ADE configuration types.
 *
 * The configuration is ADE's central contract: it describes the project's
 * context sources, deterministic rules, orchestrated tools and workflow
 * profiles. It never contains a mandatory LLM dependency and never stores
 * secrets or API tokens — a provider's choice and secrets are supplied at
 * runtime by whatever calls ADE.
 */

/** Workflow execution profile (e.g. preCommit, ci, local, agent). */
export interface AdeProfile {
  /** Deterministic-only vs assistant-allowed execution. */
  mode?: 'deterministic' | 'assisted';
  /** Admissible context shape for this profile. */
  context?: 'compact' | 'full';
  /** Whether this profile may call an AI provider at runtime. */
  allowProvider?: boolean;
  /** Indicative token budget for AI-preparation profiles. */
  tokenBudget?: number;
  /** Prompt template identifier for AI-preparation profiles. */
  promptTemplate?: string;
  /** Privacy policy applied when preparing context. */
  privacy?: 'strict' | 'standard';
}

/** A deterministic project rule. */
export interface AdeRule {
  id: string;
  description?: string;
  /** Globs / paths / languages the rule applies to. */
  appliesTo?: string[];
  severity?: 'info' | 'warn' | 'error';
}

/** Locations of documents, ADRs and context sources. */
export interface AdeContextConfig {
  docsDir?: string;
  adrDir?: string;
  /** Extra source globs to inventory when generating context. */
  sources?: string[];
  /** Section names to include in generated context, in order. */
  sections?: string[];
  /** Where generated context artifacts are written. */
  outputDir?: string;
}

/** Output thresholds and formats. */
export interface AdeOutputConfig {
  formats?: Array<'markdown' | 'json'>;
}

/**
 * User-facing configuration, as written in `ade.config.{ts,js,mjs,json}` or a
 * preset. Every field is optional so an empty config is valid and works
 * without any AI provider.
 */
export interface AdeConfig {
  /** Presets to inherit from: local paths (starting with `.`/`/`) or npm specifiers. */
  extends?: string[];
  /** Glob patterns to ignore (adds to `.gitignore`). */
  ignore?: string[];
  /** Extra sensitive globs whose contents must never enter a context pack. */
  sensitive?: string[];
  /** Tools to orchestrate. */
  tools?: string[];
  /** Deterministic project rules. */
  rules?: AdeRule[];
  /** Named workflow profiles. */
  profiles?: Record<string, AdeProfile>;
  /** Context source and output configuration. */
  context?: AdeContextConfig;
  /** Numeric thresholds keyed by name. */
  thresholds?: Record<string, number>;
  /** Output configuration. */
  output?: AdeOutputConfig;
}

/**
 * A fully resolved configuration with all `extends` merged in. Same shape as
 * `AdeConfig` minus `extends` (already flattened) and with defaults applied
 * for the fields ADE relies on downstream.
 */
export interface ResolvedAdeConfig {
  ignore: string[];
  sensitive: string[];
  tools: string[];
  rules: AdeRule[];
  profiles: Record<string, AdeProfile>;
  context: AdeContextConfig;
  thresholds: Record<string, number>;
  output: AdeOutputConfig;
}

/** Which source(s) contributed a given configuration key. */
export interface ConfigProvenanceEntry {
  key: string;
  sources: string[];
}

/** Severity of a configuration validation finding. */
export type ConfigIssueSeverity = 'error' | 'warning';

/** A single configuration validation finding. */
export interface ConfigIssue {
  code: string;
  severity: ConfigIssueSeverity;
  message: string;
  /** Dotted path to the offending key when applicable. */
  path?: string;
}

/** Full result of resolving a configuration. */
export interface ConfigResolution {
  config: ResolvedAdeConfig;
  /** Absolute config sources in application order (presets first, root last). */
  sources: string[];
  provenance: ConfigProvenanceEntry[];
  issues: ConfigIssue[];
}
