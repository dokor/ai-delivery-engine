import { getAdeVersion } from '../cli/packageInfo.ts';
import {
  DEFAULT_LIMITS,
  McpBoundaryError,
  assertResultWithinBudget,
  withTimeout,
  type McpLimits
} from './safety.ts';
import { findTool, toolDescriptors, type ToolContext } from './tools.ts';

/**
 * MCP server for ADE, over JSON-RPC 2.0.
 *
 * Deliberately dependency-free: MCP's stdio transport is newline-delimited
 * JSON-RPC, which is small enough to implement directly, and ADE ships with no
 * runtime dependency at all — a property worth keeping. The wire format is
 * confined to this module and `stdio.ts`, so swapping in the official SDK later
 * touches these two files and no tool code.
 *
 * This module is transport-agnostic and synchronous in structure: feed it a
 * decoded message, get a response back (or nothing, for a notification). That
 * is what makes the protocol testable without spawning a process.
 */

export const LATEST_PROTOCOL_VERSION = '2025-06-18';

export const SUPPORTED_PROTOCOL_VERSIONS = [
  '2025-06-18',
  '2025-03-26',
  '2024-11-05'
] as const;

export const SERVER_NAME = 'ai-delivery-engine';

export const JSON_RPC_ERRORS = {
  invalidRequest: -32600,
  methodNotFound: -32601,
  invalidParams: -32602,
  internalError: -32603,
  parseError: -32700
} as const;

export type JsonRpcId = string | number | null;

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: JsonRpcId;
  result?: unknown;
  error?: JsonRpcError;
}

export interface AdeMcpServerOptions {
  /** Enables the write path of `ade_suggest_fix`. Off by default. */
  allowWrite?: boolean;
  limits?: McpLimits;
  env?: NodeJS.ProcessEnv;
  /** Diagnostics sink. Never stdout — stdout carries JSON-RPC only. */
  log?: (message: string) => void;
}

export interface AdeMcpServer {
  /** Handles one decoded message; resolves to undefined for notifications. */
  handle: (message: unknown) => Promise<JsonRpcResponse | undefined>;
}

const INSTRUCTIONS = [
  'AI Delivery Engine exposes deterministic project analysis: context, rules, and reviews.',
  'It adds no intelligence of its own and never calls an AI provider — you supply the reasoning,',
  'ADE supplies the facts and the rules. Every tool is read-only unless the server was started',
  'with writes enabled. Tools need an absolute project root, either as an argument or via',
  'ADE_PROJECT_ROOT; the working directory is never assumed.'
].join(' ');

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function success(id: JsonRpcId, result: unknown): JsonRpcResponse {
  return { jsonrpc: '2.0', id, result };
}

function failure(id: JsonRpcId, code: number, message: string): JsonRpcResponse {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

function negotiateProtocolVersion(requested: unknown): string {
  const supported: readonly string[] = SUPPORTED_PROTOCOL_VERSIONS;
  if (typeof requested === 'string' && supported.includes(requested)) {
    return requested;
  }
  return LATEST_PROTOCOL_VERSION;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

export function createAdeMcpServer(options: AdeMcpServerOptions = {}): AdeMcpServer {
  const limits = options.limits ?? DEFAULT_LIMITS;
  const toolContext: ToolContext = {
    allowWrite: options.allowWrite ?? false,
    limits,
    env: options.env ?? process.env,
    log: options.log ?? (() => undefined)
  };

  async function callTool(id: JsonRpcId, params: unknown): Promise<JsonRpcResponse> {
    if (!isRecord(params)) {
      return failure(id, JSON_RPC_ERRORS.invalidParams, 'tools/call requires an params object.');
    }

    const name = params.name;
    if (typeof name !== 'string') {
      return failure(id, JSON_RPC_ERRORS.invalidParams, 'tools/call requires a tool "name".');
    }

    const tool = findTool(name);
    if (!tool) {
      return failure(
        id,
        JSON_RPC_ERRORS.invalidParams,
        `Unknown tool "${name}". Call tools/list for the available tools.`
      );
    }

    const args = isRecord(params.arguments) ? params.arguments : {};

    try {
      const text = await withTimeout(tool.handler(args, toolContext), name, limits);
      return success(id, {
        content: [{ type: 'text', text: assertResultWithinBudget(text, name, limits) }],
        isError: false
      });
    } catch (error) {
      // A tool failure is reported in-band, with isError set: the model must be
      // able to read the reason and correct its call. Protocol-level faults use
      // JSON-RPC errors instead.
      if (!(error instanceof McpBoundaryError)) {
        toolContext.log(`tool "${name}" failed: ${errorMessage(error)}`);
      }
      return success(id, {
        content: [{ type: 'text', text: `${name} failed: ${errorMessage(error)}` }],
        isError: true
      });
    }
  }

  return {
    async handle(message: unknown): Promise<JsonRpcResponse | undefined> {
      if (!isRecord(message) || message.jsonrpc !== '2.0' || typeof message.method !== 'string') {
        return failure(
          null,
          JSON_RPC_ERRORS.invalidRequest,
          'Invalid JSON-RPC 2.0 request: "jsonrpc" must be "2.0" and "method" a string.'
        );
      }

      const method = message.method;
      const isNotification = message.id === undefined;
      const id = (message.id ?? null) as JsonRpcId;

      if (isNotification) {
        // Notifications never get a response, known or not.
        return undefined;
      }

      switch (method) {
        case 'initialize': {
          const params = isRecord(message.params) ? message.params : {};
          return success(id, {
            protocolVersion: negotiateProtocolVersion(params.protocolVersion),
            capabilities: { tools: { listChanged: false } },
            serverInfo: { name: SERVER_NAME, version: getAdeVersion() },
            instructions: INSTRUCTIONS
          });
        }

        case 'ping':
          return success(id, {});

        case 'tools/list':
          return success(id, { tools: toolDescriptors() });

        case 'tools/call':
          return callTool(id, message.params);

        default:
          return failure(
            id,
            JSON_RPC_ERRORS.methodNotFound,
            `Method "${method}" is not supported. This server implements initialize, ping, tools/list and tools/call.`
          );
      }
    }
  };
}
