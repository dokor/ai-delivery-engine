/**
 * Types for the deterministic, versionable project context ADE generates from
 * local sources. The context is useful without any LLM (human onboarding, an
 * explicit project map) and, when a provider is available, becomes a compact,
 * controlled input. ADE decides what is admissible; it never reads secrets,
 * environment variables or binary content.
 */

export interface ProjectContextStack {
  name?: string;
  version?: string;
  moduleType?: string;
  packageManager?: string;
  engines: Record<string, string>;
  dependencies: string[];
  devDependencies: string[];
}

export interface ProjectContextPackage {
  name: string;
  path: string;
}

export interface ProjectContextCommand {
  name: string;
  script: string;
}

export interface ProjectContextConvention {
  id: string;
  description?: string;
  severity?: string;
}

/**
 * The full project context. Deterministic: regenerating on an unchanged repo
 * yields byte-identical output. Freshness is tracked by `fingerprint`, a
 * content hash of the relevant sources plus the resolved config — never a
 * wall-clock timestamp.
 */
export interface ProjectContext {
  schemaVersion: number;
  root: string;
  fingerprint: string;
  sections: string[];
  stack: ProjectContextStack;
  packages: ProjectContextPackage[];
  modules: string[];
  commands: ProjectContextCommand[];
  conventions: ProjectContextConvention[];
  entryPoints: string[];
  sensitiveZones: string[];
  adrs: string[];
}

export type ContextFreshness = 'absent' | 'up-to-date' | 'stale';

export interface ContextCheckResult {
  state: ContextFreshness;
  contextPath: string;
  currentFingerprint: string;
  storedFingerprint?: string;
}
