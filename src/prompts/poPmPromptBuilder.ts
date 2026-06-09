import type { ParsedBrief } from '../briefs/brief.types.ts';

function renderList(items: string[], emptyFallback: string): string {
  if (items.length === 0) {
    return `- ${emptyFallback}`;
  }

  return items.map((item) => `- ${item}`).join('\n');
}

function buildOutputGuidance(): string {
  return [
    '- Return a structured backlog draft in Markdown.',
    '- Group the output by epics, then stories, then tasks.',
    '- For every story, include acceptance criteria.',
    '- For every task, suggest the most relevant owner role: `po_pm`, `ux_ui`, `frontend`, `backend`, `qa`, or `tech_lead`.',
    '- Keep the scope realistic for a first MVP.',
    '- Do not write implementation code.',
    '- Do not suggest external automation that is not required for the MVP.'
  ].join('\n');
}

function buildBacklogModelSummary(): string {
  return [
    '- Backlog item types: `epic`, `story`, `task`, `risk`.',
    '- Each item should have a clear title, a useful description, a priority (`low`, `medium`, `high`), and a status (`draft`, `review`, `ready`, `done`).',
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
    '- Do not implement code, architecture, APIs, or UI screens in detail.'
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

## Required Extra Sections

- Start with a short project summary.
- Add a section called \`Assumptions\`.
- Add a section called \`Open Questions\`.
- Then provide the backlog draft grouped by epics, stories, and tasks.

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

Produce the best possible PO/PM backlog draft for this MVP. Be concise, structured, explicit about assumptions, and careful not to drift into code implementation.
`;
}
