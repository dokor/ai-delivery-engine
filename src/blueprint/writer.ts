import { mkdir, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

import type { DeliveryPlan } from './blueprint.types.ts';

export interface WrittenDeliveryPlan {
  jsonPath: string;
  markdownPath: string;
}

function renderList(items: string[], empty: string): string[] {
  return items.length > 0 ? items.map((item) => `- ${item}`) : [`- ${empty}`];
}

export function renderDeliveryPlanMarkdown(plan: DeliveryPlan): string {
  const lines: string[] = [
    `# ${plan.projectName} Delivery Plan`,
    '',
    `Schema version: ${plan.schemaVersion}`,
    `Source brief: ${plan.sourceBrief}`,
    '',
    '## Selected Blueprint',
    '',
    `- ID: ${plan.selectedBlueprint.id}`,
    `- Name: ${plan.selectedBlueprint.name}`,
    `- Kind: ${plan.selectedBlueprint.projectKind}`,
    `- Description: ${plan.selectedBlueprint.description}`,
    `- Profiles: ${plan.selectedBlueprint.profiles.join(', ')}`,
    '',
    '## Alternatives',
    '',
    ...plan.alternatives.map((blueprint) => `- ${blueprint.id}: ${blueprint.description}`),
    '',
    '## Decisions',
    ''
  ];

  for (const decision of plan.decisions) {
    lines.push(`- ${decision.id} [${decision.status}]: ${decision.question}`);
    lines.push(`  Recommendation: ${decision.recommendation}`);
    if (decision.selectedOption) lines.push(`  Selected: ${decision.selectedOption}`);
  }

  lines.push('', '## Assumptions', '', ...renderList(plan.assumptions, 'No assumptions captured.'));
  lines.push('', '## Risks', '', ...renderList(plan.risks, 'No risks captured.'));
  lines.push('', '## Delivery Graph', '');

  for (const node of plan.graph) {
    lines.push(`### ${node.id}: ${node.title}`);
    lines.push(`- Kind: ${node.kind}`);
    lines.push(`- Role: ${node.role}`);
    lines.push(`- Depends on: ${node.dependsOn.join(', ') || 'none'}`);
    lines.push(`- Artifacts: ${node.artifacts.join(', ')}`);
    if (node.gate) {
      lines.push(`- Gate: ${node.gate.title} (${node.gate.required ? 'required' : 'optional'})`);
    }
    lines.push('');
  }

  lines.push('## Delivery Order', '', ...plan.deliveryOrder.map((nodeId, index) => `${index + 1}. ${nodeId}`));
  lines.push('', '## Backlog Trace', '');

  for (const trace of plan.backlogTrace) {
    lines.push(`- ${trace.nodeId}: ${trace.suggestedIssueTitle}`);
  }

  lines.push('', '## Graph Validation', '');
  lines.push(`- Valid: ${plan.validation.valid ? 'yes' : 'no'}`);
  lines.push(...renderList(plan.validation.errors, 'No graph validation errors.'));

  return `${lines.join('\n').trim()}\n`;
}

export async function writeDeliveryPlan(input: {
  plan: DeliveryPlan;
  briefPath: string;
  outputDirectory: string;
  outputBaseName?: string;
}): Promise<WrittenDeliveryPlan> {
  await mkdir(input.outputDirectory, { recursive: true });

  const baseName = input.outputBaseName ?? basename(input.briefPath).replace(/\.[^.]+$/, '');
  const jsonPath = join(input.outputDirectory, `${baseName}.delivery-plan.json`);
  const markdownPath = join(input.outputDirectory, `${baseName}.delivery-plan.md`);

  await Promise.all([
    writeFile(jsonPath, `${JSON.stringify(input.plan, null, 2)}\n`, 'utf8'),
    writeFile(markdownPath, renderDeliveryPlanMarkdown(input.plan), 'utf8')
  ]);

  return { jsonPath, markdownPath };
}

