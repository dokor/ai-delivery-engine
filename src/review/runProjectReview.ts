import type { ConfigResolution } from '../config/config.types.ts';
import { hasConfigErrors, resolveConfig } from '../config/loadConfig.ts';
import { checkContext } from '../context/checkContext.ts';
import type { ContextFreshness } from '../context/context.types.ts';
import type { Finding, ReviewResult, ReviewScope } from '../engine/findings.types.ts';
import { getChangedFiles } from '../engine/gitScope.ts';
import { listProjectFiles } from '../engine/projectFiles.ts';
import { reviewExitCode, runReview } from '../engine/review.ts';
import { runDeterministicPackRules } from '../rules/runRulePacks.ts';

/**
 * Deterministic review core shared by `ade review`, the CI and the
 * `ade_review_files` / `ade_review_git_diff` MCP tools.
 *
 * CLI-independent: takes an explicit project root, returns data, and never
 * touches `process.argv`, `process.cwd()`, a stream or an exit code. It never
 * calls an AI provider and never orchestrates external tools — those remain
 * opt-in concerns of the CLI, injected through `extraFindings`.
 */

export const DEFAULT_REVIEW_IGNORES = ['node_modules/**', '.git/**', 'dist/**', 'outputs/**'];

export interface RunProjectReviewOptions {
  /** Absolute path to the project to review. Never defaulted to the cwd. */
  projectRoot: string;
  /** Scope the review to the staged diff. */
  staged?: boolean;
  /** Scope the review to `<base>...HEAD`. */
  base?: string;
  /**
   * Restrict the deterministic pack rules to these repo-relative files.
   * Rule-hygiene checks always see the whole project: narrowing them would
   * report rules as unmatched merely because their target files are out of
   * scope.
   */
  files?: string[];
  /** Findings produced by the caller (tool orchestration, provider), appended as-is. */
  extraFindings?: Finding[];
  /** Pre-resolved configuration, to avoid resolving twice in one command. */
  resolution?: ConfigResolution;
}

export interface ProjectReviewOutcome {
  result: ReviewResult;
  resolution: ConfigResolution;
  contextState: ContextFreshness;
  /** Every project file considered, repo-relative. */
  projectFiles: string[];
  /** Effective ignore globs (defaults plus configured ones). */
  ignore: string[];
  /** Exit code contract: 1 on config errors or error findings, else 0. */
  exitCode: number;
}

export async function runProjectReview(
  options: RunProjectReviewOptions
): Promise<ProjectReviewOutcome> {
  const projectRoot = options.projectRoot;
  const resolution = options.resolution ?? (await resolveConfig({ cwd: projectRoot }));
  const ignore = [...DEFAULT_REVIEW_IGNORES, ...resolution.config.ignore];

  const changedFiles =
    options.staged === true || options.base !== undefined
      ? getChangedFiles({ cwd: projectRoot, staged: options.staged, base: options.base })
      : undefined;

  const scope: ReviewScope = {
    kind: options.staged === true ? 'staged' : options.base !== undefined ? 'base' : 'project',
    base: options.base,
    changedFiles: options.files ?? changedFiles
  };

  const projectFiles = await listProjectFiles(projectRoot, ignore);
  const contextDir = resolution.config.context.outputDir ?? 'outputs/context';
  const contextState = (await checkContext(projectRoot, resolution.config, contextDir)).state;

  const packFindings = await runDeterministicPackRules({
    cwd: projectRoot,
    config: resolution.config,
    files: options.files ?? projectFiles
  });

  const result = runReview({
    resolution,
    contextState,
    projectFiles,
    scope,
    extraFindings: [...packFindings, ...(options.extraFindings ?? [])]
  });

  return {
    result,
    resolution,
    contextState,
    projectFiles,
    ignore,
    exitCode: hasConfigErrors(resolution) ? 1 : reviewExitCode(result)
  };
}
