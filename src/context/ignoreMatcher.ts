/**
 * Minimal, deterministic glob matcher for ignore/sensitive patterns.
 *
 * Supports the subset of glob syntax ADE configs use: `*` (any run of
 * non-slash chars), `**` (any run including slashes), `?` (one non-slash
 * char). Patterns without a slash also match a path's basename, mirroring
 * `.gitignore` semantics (e.g. `.env*` matches `config/.env.local`).
 */

function escapeRegExp(literal: string): string {
  return literal.replace(/[.+^${}()|[\]\\]/g, '\\$&');
}

/** Translates a single glob pattern into an anchored RegExp. */
export function globToRegExp(pattern: string): RegExp {
  const normalized = pattern.replaceAll('\\', '/').replace(/\/+$/, '');
  let out = '';
  for (let i = 0; i < normalized.length; i += 1) {
    const char = normalized[i];
    if (char === '*') {
      if (normalized[i + 1] === '*') {
        // `**/` → optional path prefix; bare `**` → anything
        if (normalized[i + 2] === '/') {
          out += '(?:.*/)?';
          i += 2;
        } else {
          out += '.*';
          i += 1;
        }
      } else {
        out += '[^/]*';
      }
    } else if (char === '?') {
      out += '[^/]';
    } else {
      out += escapeRegExp(char);
    }
  }
  return new RegExp(`^${out}$`);
}

/**
 * True when `relativePath` (POSIX-style, relative to the project root) matches
 * any of the ignore `patterns`. Directory patterns like `dist/**` also match
 * the directory entry itself (`dist`).
 */
export function isIgnored(relativePath: string, patterns: string[]): boolean {
  const normalized = relativePath.replaceAll('\\', '/').replace(/^\.\//, '');
  const basename = normalized.split('/').pop() ?? normalized;

  for (const pattern of patterns) {
    const trimmed = pattern.trim();
    if (trimmed === '' || trimmed.startsWith('#')) {
      continue;
    }
    const regex = globToRegExp(trimmed);
    if (regex.test(normalized)) {
      return true;
    }
    // `dist/**` should also hide the bare `dist` directory entry.
    const dirPrefix = trimmed.replace(/\/\*\*$/, '');
    if (dirPrefix !== trimmed && (normalized === dirPrefix || normalized.startsWith(`${dirPrefix}/`))) {
      return true;
    }
    // Slash-less patterns match basenames anywhere in the tree.
    if (!trimmed.includes('/') && regex.test(basename)) {
      return true;
    }
  }
  return false;
}
