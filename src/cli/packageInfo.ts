import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** Reads ADE's own version from its package.json (works from src/ and dist/). */
export function getAdeVersion(): string {
  try {
    const pkgPath = fileURLToPath(new URL('../../package.json', import.meta.url));
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version?: string };
    return typeof pkg.version === 'string' ? pkg.version : 'unknown';
  } catch {
    return 'unknown';
  }
}
