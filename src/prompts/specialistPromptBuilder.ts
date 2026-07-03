const SPECIALIST_ROLES = [
  'ux-ui',
  'frontend',
  'backend',
  'qa',
  'tech-lead',
  'legal-compliance',
  'security',
  'devops',
  'data-analytics',
  'customer-success',
  'seo'
] as const;

export type SpecialistRole = (typeof SPECIALIST_ROLES)[number];

export function isSpecialistRole(value: string): value is SpecialistRole {
  return SPECIALIST_ROLES.includes(value as SpecialistRole);
}

export function getSpecialistRoles(): readonly SpecialistRole[] {
  return SPECIALIST_ROLES;
}

export function buildSpecialistPrompt(
  role: SpecialistRole,
  roleTemplateMarkdown: string,
  backlogItemMarkdown: string,
  backlogItemPath: string
): string {
  return `# Specialist Manual Prompt

## Selected Role

\`${role}\`

## Goal

Use the role template and backlog item below to produce a specialist response that stays local-only, provider-agnostic, and aligned with the current manual workflow.

## Working Rules

- Work only from the provided role template and backlog item context.
- Keep the response concise, practical, and easy for a human to review.
- Do not write implementation code.
- Do not invent external integrations, automation, or remote issue workflows.
- If the backlog item is unclear, call out assumptions or open questions explicitly.
- Keep the output easy to copy into a future manual backlog update.

## Role Template

\`\`\`md
${roleTemplateMarkdown.trim()}
\`\`\`

## Backlog Item Source

\`${backlogItemPath}\`

## Backlog Item

\`\`\`md
${backlogItemMarkdown.trim()}
\`\`\`

## Final Instruction

Act as the selected specialist role. Produce a review-ready response based on the role template and this backlog item only. Keep the response provider-agnostic, structured for human review, and suitable for a manual V1 workflow.
`;
}
