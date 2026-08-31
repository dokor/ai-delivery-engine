import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { spawn } from 'node:child_process';
import { realpath } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runStdioServer } from '../../src/mcp/stdio.ts';
import { JSON_RPC_ERRORS } from '../../src/mcp/server.ts';
import { createTempProject, type TempProject } from '../helpers/tempProject.ts';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

let project: TempProject | undefined;

afterEach(async () => {
  if (project) {
    await project.cleanup();
    project = undefined;
  }
});

interface StdioRun {
  responses: Array<Record<string, unknown>>;
  rawOutput: string;
  diagnostics: string;
}

/** Drives the stdio server in memory, feeding it raw text and collecting its lines. */
async function driveStdio(payload: string, allowWrite = false): Promise<StdioRun> {
  const input = new PassThrough();
  const output = new PassThrough();
  const errorOutput = new PassThrough();

  let rawOutput = '';
  let diagnostics = '';
  output.on('data', (chunk: Buffer) => {
    rawOutput += chunk.toString('utf8');
  });
  errorOutput.on('data', (chunk: Buffer) => {
    diagnostics += chunk.toString('utf8');
  });

  const finished = runStdioServer({ input, output, errorOutput, allowWrite, env: {} });

  input.write(payload);
  input.end();
  await finished;

  const responses = rawOutput
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => JSON.parse(line) as Record<string, unknown>);

  return { responses, rawOutput, diagnostics };
}

describe('stdio transport', () => {
  it('answers newline-delimited requests in order', async () => {
    const run = await driveStdio(
      [
        JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize' }),
        JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
        JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }),
        JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'ping' })
      ].join('\n') + '\n'
    );

    // The notification must not produce a line.
    assert.equal(run.responses.length, 3);
    assert.deepEqual(
      run.responses.map((response) => response.id),
      [1, 2, 3]
    );
  });

  it('handles a request split across chunks', async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    let rawOutput = '';
    output.on('data', (chunk: Buffer) => {
      rawOutput += chunk.toString('utf8');
    });

    const finished = runStdioServer({ input, output, errorOutput: new PassThrough(), env: {} });

    const message = JSON.stringify({ jsonrpc: '2.0', id: 42, method: 'ping' });
    input.write(message.slice(0, 10));
    input.write(message.slice(10));
    input.write('\n');
    input.end();
    await finished;

    const response = JSON.parse(rawOutput.trim()) as { id: number };
    assert.equal(response.id, 42);
  });

  it('treats a trailing line without a newline as a message', async () => {
    const run = await driveStdio(JSON.stringify({ jsonrpc: '2.0', id: 5, method: 'ping' }));
    assert.equal(run.responses.length, 1);
    assert.equal(run.responses[0].id, 5);
  });

  it('reports invalid JSON as a parse error and keeps serving', async () => {
    const run = await driveStdio(`{ not json\n${JSON.stringify({ jsonrpc: '2.0', id: 9, method: 'ping' })}\n`);

    assert.equal(run.responses.length, 2);
    const error = run.responses[0].error as { code: number };
    assert.equal(error.code, JSON_RPC_ERRORS.parseError);
    assert.equal(run.responses[1].id, 9);
  });

  it('ignores blank lines', async () => {
    const run = await driveStdio(`\n\n${JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' })}\n\n`);
    assert.equal(run.responses.length, 1);
  });

  it('emits one JSON object per line, and nothing else', async () => {
    const run = await driveStdio(
      [
        JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize' }),
        JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }),
        JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'ade_doctor', arguments: {} } })
      ].join('\n') + '\n'
    );

    const lines = run.rawOutput.split('\n').filter((line) => line !== '');
    assert.equal(lines.length, 3);
    for (const line of lines) {
      assert.doesNotThrow(() => JSON.parse(line) as unknown, `not a single JSON object: ${line}`);
    }
  });
});

describe('ade-mcp as a real process', () => {
  it('serves a full session over stdio without polluting stdout', async () => {
    project = await createTempProject();
    await project.writeJson('package.json', { name: 'demo', version: '1.0.0' });
    const root = await realpath(project.dir);

    const child = spawn(
      process.execPath,
      ['--experimental-strip-types', join(REPO_ROOT, 'src', 'mcpServer.ts'), '--project-root', root],
      { cwd: REPO_ROOT, stdio: ['pipe', 'pipe', 'pipe'] }
    );

    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });

    const session = [
      { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } },
      { jsonrpc: '2.0', method: 'notifications/initialized' },
      { jsonrpc: '2.0', id: 2, method: 'tools/list' },
      { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'ade_doctor', arguments: {} } },
      { jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'ade_review_files', arguments: {} } }
    ];

    child.stdin.write(`${session.map((message) => JSON.stringify(message)).join('\n')}\n`);
    child.stdin.end();

    const exitCode = await new Promise<number>((resolveExit, rejectExit) => {
      child.on('error', rejectExit);
      child.on('close', (code) => resolveExit(code ?? 0));
    });

    assert.equal(exitCode, 0, `server exited ${exitCode}; stderr: ${stderr}`);

    const lines = stdout.split('\n').filter((line) => line.trim() !== '');
    assert.equal(lines.length, 4, `expected 4 responses, got ${lines.length}: ${stdout}`);

    const responses = lines.map((line) => JSON.parse(line) as Record<string, unknown>);
    assert.deepEqual(
      responses.map((response) => response.id),
      [1, 2, 3, 4]
    );

    const initialize = responses[0].result as { serverInfo: { name: string } };
    assert.equal(initialize.serverInfo.name, 'ai-delivery-engine');

    const tools = (responses[1].result as { tools: unknown[] }).tools;
    assert.equal(tools.length, 8);

    for (const index of [2, 3]) {
      const result = responses[index].result as {
        content: Array<{ text: string }>;
        isError: boolean;
      };
      assert.equal(result.isError, false, `call ${index} failed: ${result.content[0]?.text}`);
    }
  });

  it('prints help on stderr, never on stdout', async () => {
    const child = spawn(
      process.execPath,
      ['--experimental-strip-types', join(REPO_ROOT, 'src', 'mcpServer.ts'), '--help'],
      { cwd: REPO_ROOT, stdio: ['pipe', 'pipe', 'pipe'] }
    );

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8');
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });

    await new Promise<void>((resolveExit) => child.on('close', () => resolveExit()));

    assert.equal(stdout, '');
    assert.match(stderr, /ade-mcp/);
    assert.match(stderr, /--allow-write/);
  });

  it('reports an unknown argument on stderr and exits 2', async () => {
    const child = spawn(
      process.execPath,
      ['--experimental-strip-types', join(REPO_ROOT, 'src', 'mcpServer.ts'), '--wat'],
      { cwd: REPO_ROOT, stdio: ['pipe', 'pipe', 'pipe'] }
    );

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8');
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });

    const exitCode = await new Promise<number>((resolveExit) => {
      child.on('close', (code) => resolveExit(code ?? 0));
    });

    assert.equal(exitCode, 2);
    assert.equal(stdout, '');
    assert.match(stderr, /unknown argument "--wat"/);
  });
});
