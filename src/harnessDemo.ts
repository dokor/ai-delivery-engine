import { mkdir, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

import { logFailure, logLines } from './cli/logger.ts';
import { resolveOutputDirectory } from './cli/paths.ts';
import { buildContextPack } from './contextpack/buildContextPack.ts';
import type { ContextItem } from './contextpack/contextPack.types.ts';
import { AGENT_EXECUTION_SCHEMA_VERSION, type AgentExecutionRequest } from './harness/execution.types.ts';
import { DEFAULT_MOCK_HARNESS_AGENTS } from './harness/mockAgents.ts';
import { runAgentExecution } from './harness/runner.ts';

function toRelativePath(filePath: string, cwd: string): string {
  const rel = relative(cwd, filePath);
  return rel === '' ? '.' : rel.replace(/\\/g, '/');
}

function parseProvider(argv: string[]): string {
  const providerIndex = argv.indexOf('--provider');
  if (providerIndex >= 0) {
    return argv[providerIndex + 1] ?? 'mock-implementer';
  }
  return 'mock-implementer';
}

async function main(): Promise<void> {
  const cwd = process.cwd();
  const provider = parseProvider(process.argv.slice(2));
  const outputDirectory = resolveOutputDirectory(undefined, 'outputs/harness');

  const items: ContextItem[] = [
    {
      kind: 'context',
      ref: 'issue:119',
      content: [
        'Delivery Harness ADE',
        'Goal: execute agents with context, permissions, workspace and validations.',
        'Scope: local deterministic mock execution, no external provider call.'
      ].join('\n'),
      required: true
    },
    {
      kind: 'rules',
      ref: 'permissions:minimal',
      content: 'No network, no GitHub write access, only declared validation tools.'
    },
    {
      kind: 'fragment',
      ref: 'sensitive-example',
      path: '.env',
      content: 'SECRET=never-include'
    }
  ];

  const contextPack = buildContextPack(items, {
    mode: 'normal',
    budget: 12000,
    sensitivePatterns: ['.env*', '**/*.pem', '**/*.key', '**/secrets.*'],
    cacheHit: false,
    cacheKey: 'harness-demo'
  });

  const request: AgentExecutionRequest = {
    schemaVersion: AGENT_EXECUTION_SCHEMA_VERSION,
    runId: 'demo-run-119',
    nodeId: 'issue-119',
    agent: { id: provider, provider, role: 'tech-lead' },
    task: {
      id: 'issue-119',
      title: 'Delivery Harness ADE',
      acceptanceCriteria: [
        'versioned request/result contract',
        'interchangeable mock providers',
        'traceable sensitive-filtered context pack',
        'structured validations and artifacts'
      ]
    },
    contextPack,
    permissions: {
      shell: true,
      network: false,
      github: false,
      allowedTools: ['typecheck', 'test']
    },
    workspace: {
      root: cwd,
      isolation: 'current-worktree',
      writable: false
    },
    stopConditions: {
      timeoutMs: 1000,
      maxToolCalls: 2
    },
    validation: {
      commands: ['typecheck', 'test'],
      requiredArtifacts: ['outputs/harness/agent-execution-result.json']
    }
  };

  const result = await runAgentExecution(request, {
    agents: DEFAULT_MOCK_HARNESS_AGENTS,
    toolRunner: {
      async run(tool: string) {
        return { tool, status: 0, ok: true };
      }
    }
  });

  await mkdir(outputDirectory, { recursive: true });
  const requestPath = resolve(outputDirectory, 'agent-execution-request.json');
  const resultPath = resolve(outputDirectory, 'agent-execution-result.json');
  await writeFile(requestPath, `${JSON.stringify(request, null, 2)}\n`, 'utf8');
  await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');

  logLines([
    'Delivery harness demo',
    `- Provider: ${provider}`,
    `- Status: ${result.status}`,
    `- Request: ${toRelativePath(requestPath, cwd)}`,
    `- Result: ${toRelativePath(resultPath, cwd)}`,
    `- Sensitive exclusions: ${contextPack.manifest.excluded.length}`
  ]);
}

main().catch((error: unknown) => {
  logFailure('Harness demo failed', error);
});
