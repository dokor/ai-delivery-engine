import type { ResolvedAdeConfig } from '../config/config.types.ts';

/**
 * Context-preparation modes: a single knob trading token cost for precision.
 * More context → more precise reasoning → more tokens.
 *
 * - chill  — minimal context, tight budget, cheapest/fastest, lower precision;
 * - normal — balanced default;
 * - expert — richest context, large budget, most precise, most expensive.
 *
 * Modes are presets over the reduction levers and map onto `ade.config`
 * profiles, so a project can override any single lever (e.g. `tokenBudget`).
 */
export type ModeName = 'chill' | 'normal' | 'expert';

export type ContextGranularity = 'project' | 'compact' | 'full';

export interface ModeSettings {
  name: ModeName;
  tokenBudget: number;
  contextGranularity: ContextGranularity;
  maxFragments: number;
  includeDocs: boolean;
}

export const DEFAULT_MODE: ModeName = 'normal';

const PRESETS: Record<ModeName, ModeSettings> = {
  chill: { name: 'chill', tokenBudget: 4000, contextGranularity: 'project', maxFragments: 0, includeDocs: false },
  normal: { name: 'normal', tokenBudget: 12000, contextGranularity: 'compact', maxFragments: 5, includeDocs: false },
  expert: { name: 'expert', tokenBudget: 32000, contextGranularity: 'full', maxFragments: 20, includeDocs: true }
};

export function isModeName(value: string): value is ModeName {
  return value === 'chill' || value === 'normal' || value === 'expert';
}

export function listModeNames(): ModeName[] {
  return ['chill', 'normal', 'expert'];
}

/**
 * Resolves the effective settings for a mode, letting a same-named config
 * profile override the budget and context granularity. The profile's
 * `context: compact|full` maps onto granularity; `tokenBudget` overrides the
 * budget. Everything else falls back to the preset.
 */
export function resolveMode(name: ModeName, config: ResolvedAdeConfig): ModeSettings {
  const preset = PRESETS[name];
  const profile = config.profiles[name];

  const granularity: ContextGranularity =
    profile?.context === 'full' ? 'full' : profile?.context === 'compact' ? 'compact' : preset.contextGranularity;

  return {
    ...preset,
    tokenBudget:
      typeof profile?.tokenBudget === 'number' && profile.tokenBudget > 0
        ? profile.tokenBudget
        : preset.tokenBudget,
    contextGranularity: granularity
  };
}
