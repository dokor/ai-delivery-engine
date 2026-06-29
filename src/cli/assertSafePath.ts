import { resolve } from 'node:path';

/**
 * Asserts that `targetPath` (already resolved to an absolute path) stays
 * within `basePath`. Throws if the resolved path escapes the base directory
 * via path traversal (e.g. `../../etc/passwd`).
 *
 * This guard matters in V2 when CLI arguments may originate from external
 * sources (API payloads, orchestration inputs). In V1 local usage the risk
 * is low but the guard costs nothing and prevents accidents.
 */
export function assertSafePath(targetPath: string, basePath: string): void {
  const resolvedTarget = resolve(targetPath);
  const resolvedBase = resolve(basePath);

  // Normalise to forward slashes for cross-platform comparison.
  const normalizedTarget = resolvedTarget.replaceAll('\\', '/');
  const normalizedBase = resolvedBase.replaceAll('\\', '/');

  if (
    normalizedTarget !== normalizedBase &&
    !normalizedTarget.startsWith(`${normalizedBase}/`)
  ) {
    throw new Error(
      `Path traversal detected: "${targetPath}" resolves outside the allowed base directory "${basePath}".`
    );
  }
}
