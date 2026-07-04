import { developmentPack } from './packs/development.ts';
import { frontendNextPack } from './packs/frontendNext.ts';
import { frontendReactPack } from './packs/frontendReact.ts';
import { frontendAngularPack } from './packs/frontendAngular.ts';
import { frontendWordpressPack } from './packs/frontendWordpress.ts';
import { backendJavaPack } from './packs/backendJava.ts';
import type { PackRule, RulePack } from './rulePack.types.ts';

/** All built-in rule packs, keyed by pack id. */
const PACKS: Record<string, RulePack> = {
  [developmentPack.id]: developmentPack,
  [frontendNextPack.id]: frontendNextPack,
  [frontendReactPack.id]: frontendReactPack,
  [frontendAngularPack.id]: frontendAngularPack,
  [frontendWordpressPack.id]: frontendWordpressPack,
  [backendJavaPack.id]: backendJavaPack
};

export function getAllPacks(): RulePack[] {
  return Object.values(PACKS).sort((left, right) => left.id.localeCompare(right.id));
}

export function getPack(id: string): RulePack | undefined {
  return PACKS[id];
}

export function listPackIds(): string[] {
  return getAllPacks().map((pack) => pack.id);
}

export interface ResolvedPacks {
  packs: RulePack[];
  /** Requested pack ids that do not exist. */
  missing: string[];
}

/**
 * Resolves requested ids to packs, reporting unknown ids. An id can be an exact
 * pack (`frontend/next`) or a profile namespace (`frontend`, `backend`,
 * `development`) that expands to every pack under it. Results are de-duplicated.
 */
export function resolveActivePacks(ids: string[]): ResolvedPacks {
  const packs: RulePack[] = [];
  const missing: string[] = [];
  const seen = new Set<string>();

  const add = (pack: RulePack): void => {
    if (!seen.has(pack.id)) {
      seen.add(pack.id);
      packs.push(pack);
    }
  };

  for (const id of ids) {
    const exact = PACKS[id];
    if (exact) {
      add(exact);
      continue;
    }
    const children = getAllPacks().filter((pack) => pack.id.startsWith(`${id}/`));
    if (children.length > 0) {
      children.forEach(add);
      continue;
    }
    missing.push(id);
  }

  return { packs, missing };
}

/** Flattened, de-duplicated rules of the active packs (first occurrence wins). */
export function activeRules(ids: string[]): PackRule[] {
  const seen = new Set<string>();
  const rules: PackRule[] = [];
  for (const pack of resolveActivePacks(ids).packs) {
    for (const rule of pack.rules) {
      if (!seen.has(rule.id)) {
        seen.add(rule.id);
        rules.push(rule);
      }
    }
  }
  return rules;
}
