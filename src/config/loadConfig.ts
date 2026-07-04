import { createRequire } from 'node:module';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { access } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

import { readJsonFile } from '../cli/readJson.ts';
import type { AdeConfig, ConfigIssue, ConfigResolution } from './config.types.ts';
import {
  emptyResolvedConfig,
  mergeConfigLayer,
  provenanceToArray
} from './mergeConfig.ts';
import { validateLayer } from './validateConfig.ts';

/** Config filenames searched in the project root, in priority order. */
const CONFIG_FILENAMES = [
  'ade.config.ts',
  'ade.config.mjs',
  'ade.config.js',
  'ade.config.json',
  '.ade/config.json'
];

const MODULE_EXTENSIONS = ['.ts', '.mjs', '.js', '.cjs'];

function toRelativeLabel(absolutePath: string, cwd: string): string {
  const rel = relative(cwd, absolutePath);
  return rel === '' ? '.' : rel.replace(/\\/g, '/');
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/** Finds the first existing config file in `cwd`, or undefined. */
export async function findConfigFile(cwd: string): Promise<string | undefined> {
  for (const name of CONFIG_FILENAMES) {
    const candidate = resolve(cwd, name);
    if (await fileExists(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

/** Loads a config file's raw exported value (JSON parsed, or module default). */
async function loadConfigFile(absolutePath: string): Promise<unknown> {
  if (absolutePath.endsWith('.json')) {
    return readJsonFile(absolutePath, 'Invalid JSON in configuration file');
  }
  const moduleUrl = pathToFileURL(absolutePath).href;
  const imported = (await import(moduleUrl)) as { default?: unknown };
  return imported.default ?? imported;
}

/**
 * Resolves a single `extends` entry to an absolute path. Local paths (starting
 * with `.` or absolute) resolve relative to the declaring config's directory;
 * bare specifiers (npm presets) resolve from `cwd`. Missing presets are
 * reported as errors and return undefined.
 */
function resolvePreset(
  entry: string,
  declaringDir: string,
  cwd: string,
  issues: ConfigIssue[]
): string | undefined {
  if (entry.startsWith('.') || isAbsolute(entry)) {
    return resolve(declaringDir, entry);
  }
  try {
    const requireFromCwd = createRequire(join(cwd, 'noop.js'));
    return requireFromCwd.resolve(entry);
  } catch {
    issues.push({
      code: 'MISSING_PRESET',
      severity: 'error',
      message: `Preset "${entry}" could not be resolved from "${toRelativeLabel(cwd, cwd)}".`,
      path: 'extends'
    });
    return undefined;
  }
}

interface MergeState {
  cwd: string;
  accumulator: ReturnType<typeof emptyResolvedConfig>;
  provenance: Map<string, string[]>;
  sources: string[];
  issues: ConfigIssue[];
}

/** Depth-first: apply a config's presets before the config itself. */
async function loadAndMerge(
  absolutePath: string,
  state: MergeState,
  stack: string[]
): Promise<void> {
  const label = toRelativeLabel(absolutePath, state.cwd);

  if (stack.includes(absolutePath)) {
    state.issues.push({
      code: 'EXTENDS_CYCLE',
      severity: 'error',
      message: `Configuration extends cycle detected: ${[...stack, absolutePath]
        .map((p) => toRelativeLabel(p, state.cwd))
        .join(' -> ')}.`,
      path: 'extends'
    });
    return;
  }

  let raw: unknown;
  try {
    raw = await loadConfigFile(absolutePath);
  } catch (error: unknown) {
    state.issues.push({
      code: 'CONFIG_READ_ERROR',
      severity: 'error',
      message: `Failed to read configuration "${label}": ${
        error instanceof Error ? error.message : 'unknown error'
      }`
    });
    return;
  }

  const { sanitized, issues } = validateLayer(raw, label);
  state.issues.push(...issues);

  const nextStack = [...stack, absolutePath];
  for (const entry of sanitized.extends ?? []) {
    const presetPath = resolvePreset(entry, dirname(absolutePath), state.cwd, state.issues);
    if (presetPath) {
      await loadAndMerge(presetPath, state, nextStack);
    }
  }

  const { extends: _extends, ...layerWithoutExtends } = sanitized;
  mergeConfigLayer(state.accumulator, layerWithoutExtends as AdeConfig, label, state.provenance);
  state.sources.push(label);
}

export interface ResolveConfigOptions {
  cwd?: string;
  /** Explicit config file path; when omitted, ADE searches `cwd`. */
  configPath?: string;
}

/**
 * Resolves the effective ADE configuration for a project: locates the root
 * config, flattens its `extends` chain deterministically (presets first),
 * validates every layer, scans for secrets, and returns the merged config with
 * full provenance. Pure and side-effect free so the CLI, CI and MCP all get
 * identical results. Never throws on config problems — they are returned as
 * `issues` for the caller to surface.
 */
export async function resolveConfig(options: ResolveConfigOptions = {}): Promise<ConfigResolution> {
  const cwd = resolve(options.cwd ?? process.cwd());
  const state: MergeState = {
    cwd,
    accumulator: emptyResolvedConfig(),
    provenance: new Map(),
    sources: [],
    issues: []
  };

  const rootPath = options.configPath
    ? resolve(cwd, options.configPath)
    : await findConfigFile(cwd);

  if (!rootPath) {
    state.issues.push({
      code: 'CONFIG_NOT_FOUND',
      severity: 'warning',
      message: `No ADE config file found in "${toRelativeLabel(cwd, cwd)}"; using built-in defaults.`
    });
    return {
      config: state.accumulator,
      sources: [],
      provenance: [],
      issues: state.issues
    };
  }

  if (options.configPath) {
    const ext = rootPath.slice(rootPath.lastIndexOf('.'));
    if (ext !== '.json' && !MODULE_EXTENSIONS.includes(ext)) {
      state.issues.push({
        code: 'UNSUPPORTED_CONFIG_EXTENSION',
        severity: 'error',
        message: `Unsupported config extension "${ext}"; use .ts, .js, .mjs or .json.`
      });
      return { config: state.accumulator, sources: [], provenance: [], issues: state.issues };
    }
  }

  await loadAndMerge(rootPath, state, []);

  return {
    config: state.accumulator,
    sources: state.sources,
    provenance: provenanceToArray(state.provenance),
    issues: state.issues
  };
}

/** True when a resolution has at least one error-severity issue. */
export function hasConfigErrors(resolution: ConfigResolution): boolean {
  return resolution.issues.some((issue) => issue.severity === 'error');
}
