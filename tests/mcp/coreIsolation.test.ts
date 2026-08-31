import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Guards the property the MCP server rests on: the modules it calls are free of
 * process and stream coupling.
 *
 * Without this test, the extraction that made ADE importable would rot — a
 * single `console.log` reintroduced on a tool's call path corrupts the JSON-RPC
 * stream, and a single `process.cwd()` silently analyses the wrong project. Both
 * failures are invisible in normal CLI use, which is exactly why they need a
 * mechanical check rather than a review habit.
 */

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = join(REPO_ROOT, 'src');

/** Directories reachable from an MCP tool call. */
const CORE_DIRECTORIES = [
  'mcp',
  'doctor',
  'fix',
  'review',
  'engine',
  'rules',
  'context',
  'contextpack',
  'config'
];

/**
 * `config/loadConfig.ts` defaults its `cwd` option to `process.cwd()`. Every MCP
 * path passes the project root explicitly, so the default is never reached from
 * the server — it is tolerated here rather than silently ignored.
 */
const CWD_EXCEPTIONS = new Set(['config/loadConfig.ts']);

/** Removes comments and string literals, so prose about `console.log` is not a hit. */
function stripCommentsAndStrings(source: string): string {
  return source
    .replaceAll(/\/\*[\s\S]*?\*\//g, ' ')
    .replaceAll(/\/\/[^\n]*/g, ' ')
    .replaceAll(/'(?:[^'\\\n]|\\.)*'/g, "''")
    .replaceAll(/"(?:[^"\\\n]|\\.)*"/g, '""')
    .replaceAll(/`(?:[^`\\]|\\.)*`/g, '``');
}

async function coreFiles(): Promise<string[]> {
  const found: string[] = [];

  async function walk(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const full = join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
        found.push(full);
      }
    }
  }

  for (const directory of CORE_DIRECTORIES) {
    await walk(join(SRC, directory));
  }
  return found.sort();
}

interface Offence {
  file: string;
  pattern: string;
}

async function scan(patterns: Array<{ label: string; regexp: RegExp; skip?: Set<string> }>): Promise<Offence[]> {
  const offences: Offence[] = [];

  for (const file of await coreFiles()) {
    const relativePath = relative(SRC, file).replaceAll('\\', '/');
    const code = stripCommentsAndStrings(await readFile(file, 'utf8'));

    for (const pattern of patterns) {
      if (pattern.skip?.has(relativePath)) {
        continue;
      }
      if (pattern.regexp.test(code)) {
        offences.push({ file: relativePath, pattern: pattern.label });
      }
    }
  }

  return offences;
}

describe('core isolation', () => {
  it('finds the core modules to guard', async () => {
    const files = await coreFiles();
    assert.ok(files.length > 20, `expected the core to span many files, found ${files.length}`);
  });

  it('never writes to a console from the core', async () => {
    const offences = await scan([
      { label: 'console.*', regexp: /\bconsole\s*\.\s*(log|error|warn|info|debug|trace)\b/ }
    ]);
    assert.deepEqual(offences, [], `stdout/stderr writes found in the core: ${JSON.stringify(offences)}`);
  });

  it('never reads process.argv from the core', async () => {
    const offences = await scan([{ label: 'process.argv', regexp: /\bprocess\s*\.\s*argv\b/ }]);
    assert.deepEqual(offences, [], `argv parsing found in the core: ${JSON.stringify(offences)}`);
  });

  it('never sets an exit code from the core', async () => {
    const offences = await scan([
      { label: 'process.exitCode', regexp: /\bprocess\s*\.\s*exitCode\b/ },
      { label: 'process.exit()', regexp: /\bprocess\s*\.\s*exit\s*\(/ }
    ]);
    assert.deepEqual(offences, [], `process exit control found in the core: ${JSON.stringify(offences)}`);
  });

  it('never falls back to the working directory from the core', async () => {
    const offences = await scan([
      { label: 'process.cwd()', regexp: /\bprocess\s*\.\s*cwd\s*\(/, skip: CWD_EXCEPTIONS }
    ]);
    assert.deepEqual(offences, [], `working-directory dependency found in the core: ${JSON.stringify(offences)}`);
  });

  it('keeps the documented cwd exception documented', async () => {
    // If the exception is fixed, remove it from CWD_EXCEPTIONS rather than
    // leaving a stale allowance behind.
    for (const exception of CWD_EXCEPTIONS) {
      const code = stripCommentsAndStrings(await readFile(join(SRC, exception), 'utf8'));
      assert.match(
        code,
        /\bprocess\s*\.\s*cwd\s*\(/,
        `${exception} no longer uses process.cwd(): drop it from CWD_EXCEPTIONS`
      );
    }
  });

  it('keeps ADE free of runtime dependencies', async () => {
    const pkg = JSON.parse(await readFile(join(REPO_ROOT, 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>;
    };
    assert.equal(
      pkg.dependencies,
      undefined,
      'ADE ships with no runtime dependency; adding one is a deliberate decision, not an accident'
    );
  });

  it('exposes the MCP entrypoint from the package', async () => {
    const pkg = JSON.parse(await readFile(join(REPO_ROOT, 'package.json'), 'utf8')) as {
      main?: string;
      exports?: Record<string, string>;
      bin?: Record<string, string>;
      files?: string[];
    };

    assert.equal(pkg.main, 'dist/api.js');
    assert.equal(pkg.exports?.['.'], './dist/api.js');
    assert.equal(pkg.bin?.['ade-mcp'], 'src/mcp-server.js');
    assert.ok(
      pkg.files?.includes('src/mcp-server.js'),
      'the ade-mcp bin must be published, or the installed package cannot start the server'
    );
  });
});
