import type { ResolvedAdeConfig } from '../config/config.types.ts';
import type { ProjectContext } from '../context/context.types.ts';
import { renderContextMarkdown } from '../context/renderContext.ts';
import type { ContextGranularity, ModeSettings } from './modes.ts';
import type { ContextItem } from './contextPack.types.ts';

/** Renders the project context at the requested granularity. */
export function renderContextForPack(
  context: ProjectContext,
  granularity: ContextGranularity
): string {
  if (granularity === 'full') {
    return renderContextMarkdown(context);
  }

  const lines: string[] = [
    `Project: ${context.stack.name ?? 'n/a'} (${context.stack.moduleType ?? 'n/a'})`,
    `Modules: ${context.modules.join(', ') || 'none'}`,
    `Commands: ${context.commands.map((c) => c.name).join(', ') || 'none'}`
  ];

  if (granularity === 'compact') {
    lines.push(`Packages: ${context.packages.map((p) => p.name).join(', ') || 'none'}`);
    lines.push(`Entry points: ${context.entryPoints.join(', ') || 'none'}`);
    if (context.conventions.length > 0) {
      lines.push(`Conventions: ${context.conventions.map((c) => c.id).join(', ')}`);
    }
  }

  return lines.join('\n');
}

export interface AssembleItemsParams {
  context: ProjectContext;
  config: ResolvedAdeConfig;
  mode: ModeSettings;
  /** Optional diff / changed-files content (required item, never dropped). */
  diffContent?: string;
  diffRef?: string;
  /** Optional pre-ranked neighbour fragments (capped by the mode). */
  fragments?: ContextItem[];
}

/**
 * Builds the candidate context items for a pack from the currently available
 * local sources: the project context (at the mode's granularity), the
 * applicable rules, ADRs (expert mode only), the diff when provided, and any
 * supplied neighbour fragments (capped by `mode.maxFragments`). Provider-
 * agnostic and side-effect free.
 */
export function assembleContextItems(params: AssembleItemsParams): ContextItem[] {
  const { context, config, mode, diffContent, diffRef, fragments } = params;
  const items: ContextItem[] = [];

  items.push({
    kind: 'context',
    ref: `context:${mode.contextGranularity}`,
    content: renderContextForPack(context, mode.contextGranularity),
    reason: `${mode.contextGranularity} project context`
  });

  if (config.rules.length > 0) {
    const content = config.rules
      .map((rule) => `- ${rule.id}${rule.severity ? ` (${rule.severity})` : ''}: ${rule.description ?? ''}`.trimEnd())
      .join('\n');
    items.push({ kind: 'rules', ref: 'rules:applicable', content, reason: 'applicable project rules' });
  }

  if (mode.includeDocs && context.adrs.length > 0) {
    items.push({
      kind: 'docs',
      ref: 'docs:adrs',
      content: context.adrs.map((adr) => `- ${adr}`).join('\n'),
      reason: 'architecture decision records'
    });
  }

  if (fragments && fragments.length > 0 && mode.maxFragments > 0) {
    for (const fragment of fragments.slice(0, mode.maxFragments)) {
      items.push({ ...fragment, kind: 'fragment' });
    }
  }

  if (diffContent) {
    items.push({
      kind: 'diff',
      ref: diffRef ?? 'diff',
      content: diffContent,
      reason: 'changed files in scope',
      required: true
    });
  }

  return items;
}
