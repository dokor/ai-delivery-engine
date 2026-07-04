import { spawnSync } from 'node:child_process';

export interface GitScopeOptions {
  cwd: string;
  staged?: boolean;
  base?: string;
}

/**
 * Returns the repo-relative changed files for the requested scope, or undefined
 * when the directory is not a git repo or git is unavailable. Read-only and
 * non-interactive — safe for CI. Never throws.
 */
export function getChangedFiles(options: GitScopeOptions): string[] | undefined {
  const args = ['diff', '--name-only'];
  if (options.staged) {
    args.push('--cached');
  } else if (options.base) {
    args.push(`${options.base}...HEAD`);
  }

  const result = spawnSync('git', args, { cwd: options.cwd, encoding: 'utf8' });
  if (result.status !== 0 || typeof result.stdout !== 'string') {
    return undefined;
  }

  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .map((line) => line.replaceAll('\\', '/'))
    .sort((left, right) => left.localeCompare(right));
}
