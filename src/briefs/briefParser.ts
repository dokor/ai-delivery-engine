import type { BriefSectionName, ParsedBrief } from './brief.types.ts';

const SECTION_ALIASES: Record<string, BriefSectionName> = {
  project: 'project',
  summary: 'summary',
  goals: 'goals',
  goal: 'goals',
  audience: 'audience',
  users: 'audience',
  pages: 'pages',
  scope: 'pages',
  constraints: 'constraints',
  'success criteria': 'success criteria',
  success: 'success criteria',
  notes: 'notes'
};

function normalizeSectionName(value: string): BriefSectionName | undefined {
  return SECTION_ALIASES[value.trim().toLowerCase()];
}

function cleanLine(value: string): string {
  return value.replace(/^[-*]\s+/, '').trim();
}

function collectList(sections: Partial<Record<BriefSectionName, string[]>>, key: BriefSectionName): string[] {
  return (sections[key] ?? []).map(cleanLine).filter(Boolean);
}

function collectParagraph(
  sections: Partial<Record<BriefSectionName, string[]>>,
  key: BriefSectionName,
  fallback = ''
): string {
  return (sections[key] ?? [])
    .map(cleanLine)
    .join(' ')
    .trim() || fallback;
}

export function parseBrief(markdown: string, fallbackTitle: string): ParsedBrief {
  const lines = markdown.split(/\r?\n/);
  const sections: Partial<Record<BriefSectionName, string[]>> = {};
  let title = fallbackTitle;
  let currentSection: BriefSectionName | undefined;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      continue;
    }

    if (line.startsWith('# ')) {
      title = cleanLine(line.slice(2)) || fallbackTitle;
      continue;
    }

    if (line.startsWith('## ')) {
      currentSection = normalizeSectionName(line.slice(3));

      if (currentSection && !sections[currentSection]) {
        sections[currentSection] = [];
      }

      continue;
    }

    if (!currentSection) {
      continue;
    }

    sections[currentSection] ??= [];
    sections[currentSection]?.push(line);
  }

  const summaryFallback = collectList(sections, 'project')[0] ?? '';

  return {
    title,
    summary: collectParagraph(sections, 'summary', summaryFallback),
    goals: collectList(sections, 'goals'),
    audience: collectList(sections, 'audience'),
    pages: collectList(sections, 'pages'),
    constraints: collectList(sections, 'constraints'),
    successCriteria: collectList(sections, 'success criteria'),
    notes: collectList(sections, 'notes'),
    sections,
    raw: markdown
  };
}
