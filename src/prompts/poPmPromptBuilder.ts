import type { ParsedBrief } from '../briefs/brief.types.ts';
import {
  buildPoPmOutputJsonShapeExample,
  PO_PM_OUTPUT_CONTRACT
} from '../contracts/poPmOutputContract.ts';

function renderList(items: string[], emptyFallback: string): string {
  if (items.length === 0) {
    return `- ${emptyFallback}`;
  }

  return items.map((item) => `- ${item}`).join('\n');
}

function buildOutputGuidance(): string {
  return [
    '- Return exactly one structured JSON object.',
    '- Wrap that JSON object in a single fenced Markdown block using a `json` code fence.',
    '- Do not return a prose-only answer.',
    '- Do not return Markdown sections outside the JSON fence except for the fence itself.',
    '- For every story, include acceptance criteria.',
    '- For every task, suggest the most relevant owner role: `po_pm`, `ux_ui`, `frontend`, `backend`, `qa`, or `tech_lead`.',
    '- Keep the scope realistic for a first MVP.',
    '- Do not write implementation code.',
    '- Do not suggest external automation that is not required for the MVP.'
  ].join('\n');
}

function buildBacklogModelSummary(): string {
  return [
    `- Backlog item types: \`${PO_PM_OUTPUT_CONTRACT.allowedItemTypes.join('`, `')}\`.`,
    `- Each item should have a clear title, a useful description, a priority (\`${PO_PM_OUTPUT_CONTRACT.allowedPriorities.join('`, `')}\`), and a status (\`${PO_PM_OUTPUT_CONTRACT.allowedStatuses.join('`, `')}\`).`,
    '- Stories should include acceptance criteria.',
    '- Use assumptions and notes when information is missing or uncertain.',
    '- Prefer a backlog that is reviewable and implementation-ready over a long speculative document.'
  ].join('\n');
}

function buildRoleRules(brief: ParsedBrief): string {
  const lines = [
    '- You are acting as the PO/PM role inside AI Delivery Engine.',
    '- Your job is to turn the brief into a first backlog draft that a human can review before any implementation starts.',
    '- Keep the output provider-agnostic and local-first in spirit.',
    '- Ask useful open questions, but do not block the backlog draft when information is missing.',
    '- State assumptions explicitly whenever the brief leaves gaps.',
    '- Do not implement code, architecture, APIs, UI screens, or GitHub issue payloads.',
    '- Use only the contract fields described below.'
  ];

  if (brief.constraints.length > 0) {
    lines.push(`- Respect these constraints from the brief: ${brief.constraints.join('; ')}.`);
  }

  return lines.join('\n');
}

export function buildPoPmPrompt(brief: ParsedBrief): string {
  return `# PO/PM Manual Prompt

## Agent Role

You are the PO/PM agent for AI Delivery Engine.

## Mission

Transform the project brief into a structured backlog draft for a first MVP release.

## Rules And Constraints

${buildRoleRules(brief)}

## Backlog Model Summary

${buildBacklogModelSummary()}

## Expected Output Guidance

${buildOutputGuidance()}

## Required Output Contract

Return a single JSON object with these required root fields:

\`${PO_PM_OUTPUT_CONTRACT.rootRequiredFields.join('`, `')}\`

Every item in \`items\` must include these required fields:

\`${PO_PM_OUTPUT_CONTRACT.backlogItemRequiredFields.join('`, `')}\`

Optional backlog item fields:

\`${PO_PM_OUTPUT_CONTRACT.backlogItemOptionalFields.join('`, `')}\`

## JSON Shape Example

\`\`\`json
${buildPoPmOutputJsonShapeExample()}
\`\`\`

## Brief Highlights

### Project Title

${brief.title}

### Summary

${brief.summary || 'No summary was provided.'}

### Goals

${renderList(brief.goals, 'No explicit goals were provided.')}

### Audience

${renderList(brief.audience, 'No explicit audience was provided.')}

### Pages Or Surfaces

${renderList(brief.pages, 'No explicit pages or surfaces were provided.')}

### Constraints

${renderList(brief.constraints, 'No explicit constraints were provided.')}

### Success Criteria

${renderList(brief.successCriteria, 'No explicit success criteria were provided.')}

## Original Brief

\`\`\`md
${brief.raw.trim()}
\`\`\`

## Final Instruction

Produce the best possible PO/PM backlog draft for this MVP. Return only one fenced \`json\` block that follows the contract exactly, be explicit about assumptions and open questions, and do not drift into code implementation or prose-only explanation.
`;
}
