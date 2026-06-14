import { getSpecialistRoles, isSpecialistRole } from '../prompts/specialistPromptBuilder.ts';
import type { SpecialistCheckFinding, SpecialistCheckReport } from './specialistCheck.types.ts';

const REQUIRED_SECTION_TITLES = [
  'Role',
  'Scope',
  'Item Notes',
  'Assumptions',
  'Open Questions',
  'Risks',
  'Suggested Backlog Updates'
] as const;

const BACKLOG_ITEM_ID_PATTERN = /\b(?:epic|story|task|risk)-\d+\b/g;
const MIN_MEANINGFUL_CHARACTERS = 24;
const MIN_WORDS = 4;
const PLACEHOLDER_PATTERNS = [
  /\btbd\b/i,
  /\btodo\b/i,
  /\bplaceholder\b/i,
  /\blorem ipsum\b/i,
  /<fill/i,
  /\[fill/i
];
const FORBIDDEN_CLAIM_PATTERNS: Array<{
  code: string;
  message: string;
  patterns: RegExp[];
}> = [
  {
    code: 'FORBIDDEN_CLAIM_IMPLEMENTED',
    message:
      'Suspicious implementation claim detected. Specialist responses should recommend work, not claim implementation was done.',
    patterns: [/\bimplemented\b/i]
  },
  {
    code: 'FORBIDDEN_CLAIM_DEPLOYED',
    message:
      'Suspicious deployment claim detected. Specialist responses should stay review-oriented and local-first.',
    patterns: [/\balready deployed\b/i]
  },
  {
    code: 'FORBIDDEN_CLAIM_MERGED',
    message:
      'Suspicious merge claim detected. Specialist responses should not claim repository changes were merged.',
    patterns: [/\bmerged\b/i]
  },
  {
    code: 'FORBIDDEN_CLAIM_APPROVED',
    message:
      'Suspicious approval claim detected. Specialist responses should not approve work automatically.',
    patterns: [/\bapproved\b/i]
  },
  {
    code: 'FORBIDDEN_CLAIM_ISSUE_CREATED',
    message:
      'Suspicious remote issue creation claim detected. Specialist responses should not claim issues were created remotely.',
    patterns: [/\bissue created\b/i, /\bcreated issue\b/i]
  },
  {
    code: 'FORBIDDEN_CLAIM_BRANCH_CREATED',
    message:
      'Suspicious branch creation claim detected. Specialist responses should not claim git branches were created.',
    patterns: [/\bbranch created\b/i, /\bcreated branch\b/i]
  },
  {
    code: 'FORBIDDEN_CLAIM_STATUS_UPDATED',
    message:
      'Suspicious status update claim detected. Specialist responses should not claim statuses were updated automatically.',
    patterns: [/\bstatus updated\b/i, /\bupdated status\b/i]
  }
];

function createFinding(
  severity: SpecialistCheckFinding['severity'],
  code: string,
  message: string,
  section?: string
): SpecialistCheckFinding {
  return {
    severity,
    code,
    message,
    section
  };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractSection(markdown: string, title: string): string | undefined {
  const pattern = new RegExp(
    `^## ${escapeRegex(title)}\\s*$\\r?\\n([\\s\\S]*?)(?=^##\\s+|^#\\s+|(?![\\s\\S]))`,
    'm'
  );
  const match = markdown.match(pattern);

  return match?.[1].trim();
}

function isPlaceholderText(value: string): boolean {
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value));
}

function hasEnoughMeaningfulContent(sectionTitle: string, content: string | undefined): boolean {
  if (!content) {
    return false;
  }

  const trimmed = content.trim();

  if (trimmed.length === 0) {
    return false;
  }

  if (sectionTitle === 'Role') {
    return true;
  }

  if (
    ['Assumptions', 'Open Questions', 'Risks', 'Suggested Backlog Updates'].includes(sectionTitle) &&
    /^- No\b/i.test(trimmed)
  ) {
    return true;
  }

  return trimmed.length >= MIN_MEANINGFUL_CHARACTERS && trimmed.split(/\s+/).length >= MIN_WORDS;
}

function parseDetectedRole(roleSection: string | undefined): string | undefined {
  if (!roleSection) {
    return undefined;
  }

  return roleSection
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);
}

function findBacklogItemIds(markdown: string): string[] {
  return [...new Set(markdown.match(BACKLOG_ITEM_ID_PATTERN) ?? [])];
}

function addForbiddenClaimFindings(markdown: string, findings: SpecialistCheckFinding[]): void {
  for (const claim of FORBIDDEN_CLAIM_PATTERNS) {
    if (claim.patterns.some((pattern) => pattern.test(markdown))) {
      findings.push(createFinding('warning', claim.code, claim.message));
    }
  }
}

export function checkSpecialistResponse(
  markdown: string,
  sourceFilePath: string
): SpecialistCheckReport {
  const findings: SpecialistCheckFinding[] = [];

  if (!/^# Specialist Response\s*$/m.test(markdown)) {
    findings.push(
      createFinding(
        'error',
        'MISSING_TITLE',
        'Missing required top-level title `# Specialist Response`.'
      )
    );
  }

  const sections = new Map<string, string | undefined>();
  const placeholderSections: string[] = [];

  for (const title of REQUIRED_SECTION_TITLES) {
    const content = extractSection(markdown, title);
    sections.set(title, content);

    if (!content) {
      findings.push(
        createFinding(
          'error',
          'MISSING_SECTION',
          `Missing required section: \`## ${title}\`.`,
          title
        )
      );
      continue;
    }

    if (!hasEnoughMeaningfulContent(title, content)) {
      findings.push(
        createFinding(
          'warning',
          'WEAK_SECTION_CONTENT',
          `The \`## ${title}\` section is empty or too short for a reliable manual review.`,
          title
        )
      );
    }

    if (isPlaceholderText(content)) {
      placeholderSections.push(title);
      findings.push(
        createFinding(
          'warning',
          'PLACEHOLDER_TEXT',
          `The \`## ${title}\` section contains placeholder text.`,
          title
        )
      );
    }
  }

  if (placeholderSections.length >= 2) {
    findings.push(
      createFinding(
        'warning',
        'MULTIPLE_PLACEHOLDER_SECTIONS',
        `Multiple required sections contain placeholder text: ${placeholderSections.join(', ')}.`
      )
    );
  }

  const detectedRole = parseDetectedRole(sections.get('Role'));

  if (!detectedRole) {
    findings.push(
      createFinding(
        'error',
        'MISSING_ROLE_VALUE',
        'The `## Role` section does not include a role value.',
        'Role'
      )
    );
  } else if (!isSpecialistRole(detectedRole)) {
    findings.push(
      createFinding(
        'error',
        'UNSUPPORTED_ROLE',
        `Unsupported role "${detectedRole}". Supported roles: ${getSpecialistRoles().join(', ')}.`,
        'Role'
      )
    );
  }

  const backlogItemIds = findBacklogItemIds(markdown);

  if (backlogItemIds.length === 0) {
    findings.push(
      createFinding(
        'error',
        'MISSING_BACKLOG_ITEM_REFERENCE',
        'No backlog item reference was detected. Include at least one ID such as `story-002`, `task-005`, `risk-011`, or `epic-001`.'
      )
    );
  }

  if (markdown.trim().length < 240) {
    findings.push(
      createFinding(
        'warning',
        'VERY_SHORT_RESPONSE',
        'The overall response is very short. Add enough detail for a human to review the specialist feedback safely.'
      )
    );
  }

  addForbiddenClaimFindings(markdown, findings);

  return {
    sourceFile: sourceFilePath,
    checkedAt: new Date().toISOString(),
    detectedRole,
    backlogItemIds,
    findingsCount: findings.length,
    findings
  };
}
