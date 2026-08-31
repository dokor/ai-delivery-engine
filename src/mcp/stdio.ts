import { createAdeMcpServer, JSON_RPC_ERRORS, type AdeMcpServerOptions } from './server.ts';

/**
 * Newline-delimited JSON-RPC over stdio — MCP's local transport.
 *
 * The single hard rule of this file: **stdout carries JSON-RPC and nothing
 * else**. One stray `console.log` anywhere on a tool's call path corrupts the
 * stream and the client silently loses the session, so diagnostics go to
 * stderr, without exception.
 */

export interface StdioOptions extends AdeMcpServerOptions {
  input?: NodeJS.ReadableStream;
  output?: NodeJS.WritableStream;
  /** Diagnostics stream. Defaults to stderr. */
  errorOutput?: NodeJS.WritableStream;
}

function writeToStderr(stream: NodeJS.WritableStream, message: string): void {
  stream.write(`[ade-mcp] ${message}\n`);
}

/**
 * Runs the server until the input stream ends. Resolves when stdin closes,
 * which is how an MCP client signals shutdown.
 */
export async function runStdioServer(options: StdioOptions = {}): Promise<void> {
  const input = options.input ?? process.stdin;
  const output = options.output ?? process.stdout;
  const errorOutput = options.errorOutput ?? process.stderr;

  const log = options.log ?? ((message: string) => writeToStderr(errorOutput, message));
  const server = createAdeMcpServer({
    allowWrite: options.allowWrite,
    limits: options.limits,
    env: options.env,
    log
  });

  const write = (payload: unknown): void => {
    output.write(`${JSON.stringify(payload)}\n`);
  };

  let buffer = '';
  input.setEncoding?.('utf8');

  // Messages are handled one at a time, in arrival order: a client may pipeline
  // requests, and interleaving replies out of order would be legal JSON-RPC but
  // needlessly hard to reason about.
  let queue: Promise<void> = Promise.resolve();

  const handleLine = (line: string): void => {
    const trimmed = line.trim();
    if (trimmed === '') {
      return;
    }

    queue = queue.then(async () => {
      let message: unknown;
      try {
        message = JSON.parse(trimmed);
      } catch {
        write({
          jsonrpc: '2.0',
          id: null,
          error: { code: JSON_RPC_ERRORS.parseError, message: 'Invalid JSON.' }
        });
        return;
      }

      try {
        const response = await server.handle(message);
        if (response !== undefined) {
          write(response);
        }
      } catch (error) {
        // Defensive: handle() is not expected to throw. Report and keep serving
        // rather than killing the session.
        const detail = error instanceof Error ? error.message : 'Unknown error';
        log(`internal error: ${detail}`);
        write({
          jsonrpc: '2.0',
          id: null,
          error: { code: JSON_RPC_ERRORS.internalError, message: detail }
        });
      }
    });
  };

  return new Promise<void>((resolve, reject) => {
    input.on('data', (chunk: string | Buffer) => {
      buffer += typeof chunk === 'string' ? chunk : chunk.toString('utf8');

      let newlineIndex = buffer.indexOf('\n');
      while (newlineIndex !== -1) {
        const line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);
        handleLine(line);
        newlineIndex = buffer.indexOf('\n');
      }
    });

    input.on('error', reject);

    input.on('end', () => {
      // A last line without a trailing newline is still a message.
      if (buffer.trim() !== '') {
        handleLine(buffer);
        buffer = '';
      }
      queue.then(resolve, reject);
    });
  });
}
