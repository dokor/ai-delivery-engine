import { realpath, stat } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';

/**
 * Bounds for the MCP surface.
 *
 * A tool argument comes from a language model, not from a human typing a
 * command: the model may have read a path out of a file, an issue or a code
 * comment. Everything crossing this boundary is therefore treated as untrusted
 * input — confined to the project root, capped in size and bounded in time.
 *
 * These bounds are enforced server-side on purpose. Tool annotations
 * (`readOnlyHint` and friends) inform clients that read them, but Codex CLI
 * ignores them, so no guarantee may ever rest on an annotation.
 */

export interface McpLimits {
  /** Maximum number of file paths accepted in a single tool call. */
  maxFilesPerCall: number;
  /** Maximum size of a tool's textual result, in bytes. */
  maxResultBytes: number;
  /** Maximum duration of a single tool call, in milliseconds. */
  toolTimeoutMs: number;
}

export const DEFAULT_LIMITS: McpLimits = {
  maxFilesPerCall: 200,
  maxResultBytes: 512 * 1024,
  toolTimeoutMs: 30_000
};

/** Raised for every refusal at the MCP boundary, so callers can report it as a tool error. */
export class McpBoundaryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'McpBoundaryError';
  }
}

function normalizeSeparators(value: string): string {
  return value.replaceAll('\\', '/');
}

/**
 * Determines the project to act on, in order: the tool argument, then
 * `ADE_PROJECT_ROOT`. Never falls back to `process.cwd()` — a server started by
 * an MCP client has an arbitrary working directory, and silently reviewing the
 * wrong tree is worse than refusing.
 */
export async function resolveProjectRoot(
  candidate: string | undefined,
  env: NodeJS.ProcessEnv = process.env
): Promise<string> {
  const raw = candidate ?? env.ADE_PROJECT_ROOT;

  if (raw === undefined || raw.trim() === '') {
    throw new McpBoundaryError(
      'No project root. Pass "projectRoot" to the tool, or start the server with ADE_PROJECT_ROOT set. ' +
        'The current working directory is never used as a fallback.'
    );
  }

  if (!isAbsolute(raw)) {
    throw new McpBoundaryError(
      `Project root must be an absolute path, received "${raw}".`
    );
  }

  let real: string;
  try {
    real = await realpath(raw);
  } catch {
    throw new McpBoundaryError(`Project root does not exist: "${raw}".`);
  }

  const stats = await stat(real);
  if (!stats.isDirectory()) {
    throw new McpBoundaryError(`Project root is not a directory: "${raw}".`);
  }

  return real;
}

/**
 * Confines `candidate` to `projectRoot` and returns it repo-relative with
 * forward slashes.
 *
 * The check is string-based on resolved paths, then repeated on the real path
 * when the target exists — the second pass is what catches a symlink pointing
 * out of the project, which comparing resolved paths alone would let through.
 */
export async function toConfinedRelativePath(
  candidate: string,
  projectRoot: string
): Promise<string> {
  if (candidate.trim() === '') {
    throw new McpBoundaryError('Empty file path.');
  }

  const absolute = isAbsolute(candidate) ? resolve(candidate) : resolve(projectRoot, candidate);
  assertWithin(absolute, projectRoot, candidate);

  try {
    const real = await realpath(absolute);
    assertWithin(real, projectRoot, candidate);
    return normalizeSeparators(relative(projectRoot, real));
  } catch (error) {
    if (error instanceof McpBoundaryError) {
      throw error;
    }
    // The path does not exist yet: the string-based confinement above stands.
    return normalizeSeparators(relative(projectRoot, absolute));
  }
}

function assertWithin(absolute: string, projectRoot: string, original: string): void {
  const target = normalizeSeparators(absolute);
  const base = normalizeSeparators(projectRoot);

  if (target !== base && !target.startsWith(`${base}/`)) {
    throw new McpBoundaryError(
      `Path "${original}" resolves outside the project root "${projectRoot}" and was refused.`
    );
  }
}

/** Validates and confines a list of file arguments, refusing over-long lists outright. */
export async function toConfinedRelativePaths(
  candidates: string[],
  projectRoot: string,
  limits: McpLimits = DEFAULT_LIMITS
): Promise<string[]> {
  if (candidates.length > limits.maxFilesPerCall) {
    throw new McpBoundaryError(
      `Too many files: ${candidates.length} requested, limit is ${limits.maxFilesPerCall}. ` +
        'Narrow the call rather than expecting a truncated answer.'
    );
  }

  const confined: string[] = [];
  for (const candidate of candidates) {
    confined.push(await toConfinedRelativePath(candidate, projectRoot));
  }
  return confined;
}

/**
 * Refuses an over-long result instead of truncating it. A silently shortened
 * review reads as a complete one to the model, which is a correctness problem,
 * not a formatting one.
 */
export function assertResultWithinBudget(
  text: string,
  toolName: string,
  limits: McpLimits = DEFAULT_LIMITS
): string {
  const size = Buffer.byteLength(text, 'utf8');
  if (size > limits.maxResultBytes) {
    throw new McpBoundaryError(
      `Result of "${toolName}" is ${size} bytes, over the ${limits.maxResultBytes}-byte limit. ` +
        'Narrow the scope (fewer files, a diff scope) — the result was not truncated.'
    );
  }
  return text;
}

/** Bounds a tool call in time; the rejection names the tool and the limit. */
export async function withTimeout<T>(
  operation: Promise<T>,
  toolName: string,
  limits: McpLimits = DEFAULT_LIMITS
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;

  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(
        new McpBoundaryError(
          `Tool "${toolName}" exceeded its ${limits.toolTimeoutMs} ms budget and was interrupted.`
        )
      );
    }, limits.toolTimeoutMs);
    // Deliberately not unref'd: the timeout must fire even when nothing else
    // keeps the event loop alive. `clearTimeout` in the `finally` below is what
    // stops it from outliving the call.
  });

  try {
    return await Promise.race([operation, timeout]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}

/** Path separator re-exported for tests that build platform-specific fixtures. */
export const PATH_SEPARATOR = sep;
