import type { PackRule } from './rulePack.types.ts';
import { resolveActivePacks } from './registry.ts';

export interface ActiveRulesReport {
  activePacks: string[];
  missingPacks: string[];
  rules: Array<PackRule & { pack: string }>;
}

/** Builds the active-rules report for the given pack ids. */
export function buildActiveRulesReport(packIds: string[]): ActiveRulesReport {
  const { packs, missing } = resolveActivePacks(packIds);
  const seen = new Set<string>();
  const rules: Array<PackRule & { pack: string }> = [];

  for (const pack of packs) {
    for (const rule of pack.rules) {
      if (!seen.has(rule.id)) {
        seen.add(rule.id);
        rules.push({ ...rule, pack: pack.id });
      }
    }
  }

  return {
    activePacks: packs.map((pack) => pack.id),
    missingPacks: missing,
    rules
  };
}

export function rulesReportToJson(report: ActiveRulesReport): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}

/** Human-readable listing of the active rules. */
export function renderRulesReport(report: ActiveRulesReport): string[] {
  const lines: string[] = ['ADE rules'];
  lines.push(`- Active packs: ${report.activePacks.length > 0 ? report.activePacks.join(', ') : 'none'}`);

  if (report.missingPacks.length > 0) {
    lines.push(`- Unknown packs: ${report.missingPacks.join(', ')}`);
  }

  if (report.rules.length === 0) {
    lines.push('- No active rules. Enable packs via `packs` in ade.config.');
    return lines;
  }

  lines.push(`- Rules: ${report.rules.length}`);
  for (const rule of report.rules) {
    lines.push(`  [${rule.severity}] ${rule.id} (${rule.kind})`);
    lines.push(`    what: ${rule.explanation}`);
    lines.push(`    why:  ${rule.rationale}`);
    lines.push(`    fix:  ${rule.suggestion}`);
    if (rule.tool) {
      lines.push(`    tool: ${rule.tool}`);
    }
  }
  return lines;
}
