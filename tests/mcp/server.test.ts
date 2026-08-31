import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { access, realpath } from 'node:fs/promises';
import { join } from 'node:path';

import {
  DEFAULT_LIMITS
} from '../../src/mcp/safety.ts';
import {
  JSON_RPC_ERRORS,
  LATEST_PROTOCOL_VERSION,
  SERVER_NAME,
  createAdeMcpServer,
  type JsonRpcResponse
} from '../../src/mcp/server.ts';
import { TOOLS } from '../../src/mcp/tools.ts';
import { getAllPacks } from '../../src/rules/registry.ts';
import { runProjectReview } from '../../src/review/runProjectReview.ts';
import { renderReviewHuman } from '../../src/engine/renderFindings.ts';
import { createTempProject, type TempProject } from '../helpers/tempProject.ts';

let project: TempProject | undefined;

afterEach(async () => {
  if (project) {
    await project.cleanup();
    project = undefined;
  }
});

/** A temp project with the minimum ADE needs to review something. */
async function scaffoldProject(): Promise<string> {
  project = await createTempProject();
  await project.writeJson('package.json', {
    name: 'demo',
    version: '1.0.0',
    scripts: { test: 'node --test' }
  });
  await project.write('src/app/index.ts', 'export const x = 1;\n');
  return realpath(project.dir);
}

interface ToolCallOutcome {
  text: string;
  isError: boolean;
}

function toolOutcome(response: JsonRpcResponse | undefined): ToolCallOutcome {
  assert.ok(response, 'expected a response');
  assert.equal(response.error, undefined, `unexpected JSON-RPC error: ${JSON.stringify(response.error)}`);

  const result = response.result as {
    content: Array<{ type: string; text: string }>;
    isError: boolean;
  };
  assert.equal(result.content[0]?.type, 'text');
  return { text: result.content[0].text, isError: result.isError };
}

function call(
  server: ReturnType<typeof createAdeMcpServer>,
  name: string,
  args: Record<string, unknown> = {},
  id = 1
): Promise<JsonRpcResponse | undefined> {
  return server.handle({
    jsonrpc: '2.0',
    id,
    method: 'tools/call',
    params: { name, arguments: args }
  });
}

describe('MCP handshake', () => {
  it('echoes a protocol version it supports', async () => {
    const server = createAdeMcpServer();
    const response = await server.handle({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test', version: '0' } }
    });

    const result = response?.result as { protocolVersion: string; serverInfo: { name: string; version: string } };
    assert.equal(result.protocolVersion, '2024-11-05');
    assert.equal(result.serverInfo.name, SERVER_NAME);
    assert.equal(typeof result.serverInfo.version, 'string');
  });

  it('falls back to the latest version when the client asks for an unknown one', async () => {
    const server = createAdeMcpServer();
    const response = await server.handle({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '1999-01-01' }
    });

    const result = response?.result as { protocolVersion: string };
    assert.equal(result.protocolVersion, LATEST_PROTOCOL_VERSION);
  });

  it('advertises the tools capability', async () => {
    const server = createAdeMcpServer();
    const response = await server.handle({ jsonrpc: '2.0', id: 1, method: 'initialize' });
    const result = response?.result as { capabilities: { tools: unknown } };
    assert.ok(result.capabilities.tools);
  });

  it('answers ping', async () => {
    const server = createAdeMcpServer();
    const response = await server.handle({ jsonrpc: '2.0', id: 7, method: 'ping' });
    assert.deepEqual(response, { jsonrpc: '2.0', id: 7, result: {} });
  });

  it('never answers a notification', async () => {
    const server = createAdeMcpServer();
    assert.equal(await server.handle({ jsonrpc: '2.0', method: 'notifications/initialized' }), undefined);
    assert.equal(await server.handle({ jsonrpc: '2.0', method: 'notifications/unknown' }), undefined);
  });

  it('rejects a malformed request', async () => {
    const server = createAdeMcpServer();
    for (const message of [null, 'nope', [], { jsonrpc: '1.0', id: 1, method: 'ping' }, { jsonrpc: '2.0', id: 1 }]) {
      const response = await server.handle(message);
      assert.equal(response?.error?.code, JSON_RPC_ERRORS.invalidRequest);
    }
  });

  it('reports an unsupported method', async () => {
    const server = createAdeMcpServer();
    const response = await server.handle({ jsonrpc: '2.0', id: 2, method: 'resources/list' });
    assert.equal(response?.error?.code, JSON_RPC_ERRORS.methodNotFound);
    assert.match(response?.error?.message ?? '', /not supported/);
  });
});

describe('tools/list', () => {
  it('exposes the expected tool set', async () => {
    const server = createAdeMcpServer();
    const response = await server.handle({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
    const result = response?.result as { tools: Array<{ name: string }> };

    assert.deepEqual(
      result.tools.map((tool) => tool.name).sort(),
      [
        'ade_doctor',
        'ade_explain_rule',
        'ade_get_project_context',
        'ade_list_rules',
        'ade_project_setup',
        'ade_review_files',
        'ade_review_git_diff',
        'ade_suggest_fix'
      ]
    );
  });

  it('gives every tool a usable input schema and annotations', async () => {
    const server = createAdeMcpServer();
    const response = await server.handle({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
    const result = response?.result as {
      tools: Array<{
        name: string;
        description: string;
        inputSchema: { type: string; properties: Record<string, unknown>; additionalProperties: boolean };
        annotations: { readOnlyHint: boolean };
      }>;
    };

    for (const tool of result.tools) {
      assert.equal(tool.inputSchema.type, 'object', `${tool.name} schema type`);
      assert.equal(tool.inputSchema.additionalProperties, false, `${tool.name} rejects extra properties`);
      assert.ok(tool.description.length > 20, `${tool.name} has a real description`);
      assert.equal(typeof tool.annotations.readOnlyHint, 'boolean', `${tool.name} annotations`);
    }
  });

  it('never leaks handlers over the wire', async () => {
    const server = createAdeMcpServer();
    const response = await server.handle({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
    const serialized = JSON.stringify(response);
    assert.doesNotMatch(serialized, /handler/);
  });

  it('marks every tool but ade_suggest_fix read-only', () => {
    for (const tool of TOOLS) {
      const expected = tool.name !== 'ade_suggest_fix';
      assert.equal(tool.annotations.readOnlyHint, expected, `${tool.name} readOnlyHint`);
      assert.equal(tool.annotations.openWorldHint, false, `${tool.name} openWorldHint`);
    }
  });
});

describe('tools/call contract', () => {
  it('reports an unknown tool as an invalid-params error', async () => {
    const server = createAdeMcpServer();
    const response = await call(server, 'ade_do_everything');
    assert.equal(response?.error?.code, JSON_RPC_ERRORS.invalidParams);
    assert.match(response?.error?.message ?? '', /Unknown tool/);
  });

  it('requires a tool name', async () => {
    const server = createAdeMcpServer();
    const response = await server.handle({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: {} });
    assert.equal(response?.error?.code, JSON_RPC_ERRORS.invalidParams);
  });

  it('reports a tool failure in-band, with isError set', async () => {
    const server = createAdeMcpServer({ env: {} });
    const outcome = toolOutcome(await call(server, 'ade_doctor'));

    assert.equal(outcome.isError, true);
    assert.match(outcome.text, /ADE_PROJECT_ROOT/);
  });

  it('refuses an over-long result rather than truncating it', async () => {
    const root = await scaffoldProject();
    const server = createAdeMcpServer({
      env: { ADE_PROJECT_ROOT: root },
      limits: { ...DEFAULT_LIMITS, maxResultBytes: 32 }
    });

    const outcome = toolOutcome(await call(server, 'ade_doctor'));
    assert.equal(outcome.isError, true);
    assert.match(outcome.text, /was not truncated/);
  });

  it('rejects an argument of the wrong type', async () => {
    const root = await scaffoldProject();
    const server = createAdeMcpServer({ env: { ADE_PROJECT_ROOT: root } });

    const outcome = toolOutcome(await call(server, 'ade_review_files', { files: 'src/app/index.ts' }));
    assert.equal(outcome.isError, true);
    assert.match(outcome.text, /must be an array of strings/);
  });
});

describe('ade_review_files', () => {
  it('matches the CLI engine byte for byte', async () => {
    const root = await scaffoldProject();
    const server = createAdeMcpServer({ env: { ADE_PROJECT_ROOT: root } });

    const outcome = toolOutcome(await call(server, 'ade_review_files'));
    const expected = renderReviewHuman((await runProjectReview({ projectRoot: root })).result).join('\n');

    assert.equal(outcome.isError, false);
    assert.equal(outcome.text, expected);
  });

  it('accepts an explicit project root argument', async () => {
    const root = await scaffoldProject();
    const server = createAdeMcpServer({ env: {} });

    const outcome = toolOutcome(await call(server, 'ade_review_files', { projectRoot: root }));
    assert.equal(outcome.isError, false);
    assert.match(outcome.text, /ADE review/);
  });

  it('refuses a file outside the project root', async () => {
    const root = await scaffoldProject();
    const server = createAdeMcpServer({ env: { ADE_PROJECT_ROOT: root } });

    const outcome = toolOutcome(await call(server, 'ade_review_files', { files: ['../../etc/passwd'] }));
    assert.equal(outcome.isError, true);
    assert.match(outcome.text, /outside the project root/);
  });
});

describe('ade_review_git_diff', () => {
  it('requires a scope', async () => {
    const root = await scaffoldProject();
    const server = createAdeMcpServer({ env: { ADE_PROJECT_ROOT: root } });

    const outcome = toolOutcome(await call(server, 'ade_review_git_diff'));
    assert.equal(outcome.isError, true);
    assert.match(outcome.text, /ade_review_files/);
  });

  it('refuses staged and base together', async () => {
    const root = await scaffoldProject();
    const server = createAdeMcpServer({ env: { ADE_PROJECT_ROOT: root } });

    const outcome = toolOutcome(await call(server, 'ade_review_git_diff', { staged: true, base: 'main' }));
    assert.equal(outcome.isError, true);
    assert.match(outcome.text, /not both/);
  });

  it('says so when no diff can be determined', async () => {
    const root = await scaffoldProject();
    const server = createAdeMcpServer({ env: { ADE_PROJECT_ROOT: root } });

    const outcome = toolOutcome(await call(server, 'ade_review_git_diff', { staged: true }));
    assert.equal(outcome.isError, false);
    assert.match(outcome.text, /no diff could be determined/);
  });
});

describe('ade_list_rules and ade_explain_rule', () => {
  it('lists available packs without needing a project root', async () => {
    const server = createAdeMcpServer({ env: {} });
    const outcome = toolOutcome(await call(server, 'ade_list_rules', { scope: 'available' }));

    assert.equal(outcome.isError, false);
    assert.match(outcome.text, /ADE rule packs available/);
  });

  it('lists the rules active for a project', async () => {
    const root = await scaffoldProject();
    const server = createAdeMcpServer({ env: { ADE_PROJECT_ROOT: root } });

    const outcome = toolOutcome(await call(server, 'ade_list_rules'));
    assert.equal(outcome.isError, false);
    assert.match(outcome.text, /ADE rules/);
  });

  it('rejects an unknown scope', async () => {
    const server = createAdeMcpServer({ env: {} });
    const outcome = toolOutcome(await call(server, 'ade_list_rules', { scope: 'everything' }));

    assert.equal(outcome.isError, true);
    assert.match(outcome.text, /must be one of: active, available/);
  });

  it('explains a real rule, and says whether it is active', async () => {
    const root = await scaffoldProject();
    const server = createAdeMcpServer({ env: { ADE_PROJECT_ROOT: root } });

    const listed = toolOutcome(await call(server, 'ade_list_rules', { scope: 'available' }));
    assert.equal(listed.isError, false);

    const ruleId = firstRuleId();
    assert.ok(ruleId, 'expected at least one built-in rule');

    const outcome = toolOutcome(await call(server, 'ade_explain_rule', { ruleId }));
    assert.equal(outcome.isError, false);
    assert.match(outcome.text, new RegExp(`Rule ${ruleId}`));
    assert.match(outcome.text, /active in this project:/);
  });

  it('names known rules when asked about an unknown one', async () => {
    const server = createAdeMcpServer({ env: {} });
    const outcome = toolOutcome(await call(server, 'ade_explain_rule', { ruleId: 'nope/not-a-rule' }));

    assert.equal(outcome.isError, true);
    assert.match(outcome.text, /Unknown rule/);
    assert.match(outcome.text, /ade_list_rules/);
  });

  it('requires a rule id', async () => {
    const server = createAdeMcpServer({ env: {} });
    const outcome = toolOutcome(await call(server, 'ade_explain_rule', {}));

    assert.equal(outcome.isError, true);
    assert.match(outcome.text, /"ruleId" is required/);
  });
});

describe('ade_get_project_context', () => {
  it('returns markdown by default and json on request', async () => {
    const root = await scaffoldProject();
    const server = createAdeMcpServer({ env: { ADE_PROJECT_ROOT: root } });

    const markdown = toolOutcome(await call(server, 'ade_get_project_context'));
    assert.equal(markdown.isError, false);
    assert.match(markdown.text, /^#/m);

    const json = toolOutcome(await call(server, 'ade_get_project_context', { format: 'json' }));
    assert.equal(json.isError, false);
    assert.doesNotThrow(() => JSON.parse(json.text) as unknown);
  });
});

describe('ade_suggest_fix', () => {
  it('writes nothing by default', async () => {
    const root = await scaffoldProject();
    const server = createAdeMcpServer({ env: { ADE_PROJECT_ROOT: root } });

    const outcome = toolOutcome(await call(server, 'ade_suggest_fix'));
    assert.equal(outcome.isError, false);
    assert.match(outcome.text, /dry run/);
    assert.match(outcome.text, /Nothing was written/);

    await assert.rejects(() => access(join(root, 'ade.config.json')));
  });

  it('refuses to apply when the server is read-only', async () => {
    const root = await scaffoldProject();
    const server = createAdeMcpServer({ env: { ADE_PROJECT_ROOT: root } });

    const outcome = toolOutcome(await call(server, 'ade_suggest_fix', { apply: true }));
    assert.equal(outcome.isError, true);
    assert.match(outcome.text, /--allow-write/);

    await assert.rejects(() => access(join(root, 'ade.config.json')));
  });

  it('applies and logs to the diagnostics sink when writes are enabled', async () => {
    const root = await scaffoldProject();
    const logged: string[] = [];
    const server = createAdeMcpServer({
      env: { ADE_PROJECT_ROOT: root },
      allowWrite: true,
      log: (message) => logged.push(message)
    });

    const outcome = toolOutcome(await call(server, 'ade_suggest_fix', { apply: true }));
    assert.equal(outcome.isError, false);

    await access(join(root, 'ade.config.json'));
    assert.ok(
      logged.some((entry) => entry.includes('write applied: create-config')),
      `expected a write log, got ${JSON.stringify(logged)}`
    );
  });
});

/**
 * First built-in rule id, read from the registry rather than hard-coded: the
 * test is about the tool, not about a rule name that may legitimately change.
 */
function firstRuleId(): string | undefined {
  return getAllPacks().flatMap((pack) => pack.rules.map((rule) => rule.id))[0];
}
