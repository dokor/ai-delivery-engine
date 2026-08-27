import { access, readFile, readdir } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

import { runPoPmAgent } from './agents/poPmAgent.ts';
import { writeBacklogDraft } from './backlog/backlogWriter.ts';
import { parseBrief } from './briefs/briefParser.ts';
import { logFailure, logLines } from './cli/logger.ts';
import { deriveOutputBaseName } from './cli/paths.ts';
import { readJsonFile as readJsonFileSafe } from './cli/readJson.ts';
import { readBacklogDraftFile } from './cli/backlog.ts';
import { exportBacklogItems } from './export/backlogExporter.ts';
import { buildPoPmPrompt } from './prompts/poPmPromptBuilder.ts';
import { writePromptFile } from './prompts/promptWriter.ts';
import { reviewBacklog } from './review/backlogReview.ts';
import { writeBacklogReviewReport } from './review/reviewWriter.ts';
import { checkSpecialistResponse } from './specialist/specialistCheck.ts';
import { writeSpecialistCheckReport } from './specialist/specialistCheckWriter.ts';
import { closeDeliveryRun, parseDeliveryClosureInput } from './delivery/closure.ts';
import { writeDeliveryClosureResult } from './delivery/writer.ts';
import { parseExecutionLoopInput, runExecutionLoop } from './executionLoop/loop.ts';
import { writeExecutionLoopReport } from './executionLoop/writer.ts';
import { observeRun, parseObservableRunInput } from './observability/runReport.ts';
import { writeObservableRunReport } from './observability/writer.ts';
import { evaluateQualityGate, parseQualityGateInput } from './quality/gate.ts';
import { writeQualityGateReport } from './quality/writer.ts';
import { parseDelegationPlanInput, planDelegation } from './delegation/plan.ts';
import { writeDelegationPlanReport } from './delegation/writer.ts';
import { executeGraph, parseGraphExecutionInput } from './orchestration/graphExecution.ts';
import { writeGraphExecutionReport } from './orchestration/writer.ts';
import {
  collectProjectStatus,
  renderProjectStatus,
  writeProjectStatus
} from './status/projectStatus.ts';

const DEMO_BRIEF_PATH = 'examples/demo-project/brief.md';
const DEMO_RESPONSE_PATH = 'examples/demo-project/po-pm-response.json';
const DEMO_OUTPUT_DIRECTORY = 'outputs/demo-project';
const DEMO_EXPORT_DIRECTORY = 'outputs/demo-project/exported-items';
const DEMO_SPECIALIST_RESPONSE_PATH = 'examples/specialist-responses/frontend-story-002.md';
const DEMO_SPECIALIST_CHECK_DIRECTORY = 'outputs/demo-project/specialist-check';
const DEMO_DELIVERY_RUN_PATH = 'src/examples/sample-delivery-run.json';
const DEMO_DELIVERY_OUTPUT_DIRECTORY = 'outputs/demo-project/delivery';
const DEMO_EXECUTION_LOOP_PATH = 'src/examples/sample-execution-loop.json';
const DEMO_EXECUTION_LOOP_OUTPUT_DIRECTORY = 'outputs/demo-project/execution-loop';
const DEMO_OBSERVABLE_RUN_PATH = 'src/examples/sample-observable-run.json';
const DEMO_OBSERVABILITY_OUTPUT_DIRECTORY = 'outputs/demo-project/run-observability';
const DEMO_QUALITY_GATE_PATH = 'src/examples/sample-quality-gate.json';
const DEMO_QUALITY_GATE_OUTPUT_DIRECTORY = 'outputs/demo-project/quality-gate';
const DEMO_DELEGATION_PLAN_PATH = 'src/examples/sample-delegation-plan.json';
const DEMO_DELEGATION_PLAN_OUTPUT_DIRECTORY = 'outputs/demo-project/delegation-plan';
const DEMO_GRAPH_EXECUTION_PATH = 'src/examples/sample-graph-execution.json';
const DEMO_GRAPH_EXECUTION_OUTPUT_DIRECTORY = 'outputs/demo-project/graph-execution';

type ValidationStep = {
  label: string;
  run: () => Promise<void>;
};

type ExpectedFile = {
  label: string;
  path: string;
};

type DemoValidationSummary = {
  generatedAt: string;
  outputsDirectory: string;
  stepsRun: number;
  expectedFiles: Array<ExpectedFile & { exists: boolean }>;
  exportedMarkdownItemCount: number;
  success: boolean;
};

const STEPS: ValidationStep[] = [
  {
    label: 'Generate deterministic backlog draft',
    run: async () => {
      const briefPath = resolve(process.cwd(), DEMO_BRIEF_PATH);
      const markdown = await readFile(briefPath, 'utf8');
      const brief = parseBrief(markdown, basename(briefPath).replace(/\.[^.]+$/, ''));
      const backlogDraft = runPoPmAgent(brief, DEMO_BRIEF_PATH);

      await writeBacklogDraft({
        backlogDraft,
        briefPath,
        outputDirectory: resolve(process.cwd(), DEMO_OUTPUT_DIRECTORY)
      });
    }
  },
  {
    label: 'Generate PO/PM prompt',
    run: async () => {
      const briefPath = resolve(process.cwd(), DEMO_BRIEF_PATH);
      const markdown = await readFile(briefPath, 'utf8');
      const brief = parseBrief(markdown, basename(briefPath).replace(/\.[^.]+$/, ''));
      const promptMarkdown = buildPoPmPrompt(brief);

      await writePromptFile({
        briefPath,
        outputDirectory: resolve(process.cwd(), DEMO_OUTPUT_DIRECTORY),
        promptMarkdown
      });
    }
  },
  {
    label: 'Import demo PO/PM response',
    run: async () => {
      const inputPath = resolve(process.cwd(), DEMO_RESPONSE_PATH);
      const backlogDraft = await readBacklogDraftFile(inputPath, {
        invalidJsonPrefix: 'Invalid JSON in manual PO/PM response',
        invalidShapePrefix: 'Invalid manual PO/PM response shape'
      });

      await writeBacklogDraft({
        backlogDraft,
        briefPath: inputPath,
        outputDirectory: resolve(process.cwd(), DEMO_OUTPUT_DIRECTORY),
        outputBaseName: deriveOutputBaseName(DEMO_RESPONSE_PATH, '.normalized')
      });
    }
  },
  {
    label: 'Run backlog review',
    run: async () => {
      const normalizedBacklogPath = resolve(
        process.cwd(),
        `${DEMO_OUTPUT_DIRECTORY}/po-pm-response.normalized.backlog.json`
      );
      const backlogDraft = await readBacklogDraftFile(normalizedBacklogPath, {
        invalidJsonPrefix: 'Invalid backlog JSON',
        invalidShapePrefix: 'Invalid backlog draft for review'
      });
      const report = reviewBacklog(
        backlogDraft,
        `${DEMO_OUTPUT_DIRECTORY}/po-pm-response.normalized.backlog.json`
      );

      await writeBacklogReviewReport(
        report,
        resolve(process.cwd(), DEMO_OUTPUT_DIRECTORY),
        'backlog-review'
      );
    }
  },
  {
    label: 'Export backlog items',
    run: async () => {
      const normalizedBacklogPath = resolve(
        process.cwd(),
        `${DEMO_OUTPUT_DIRECTORY}/po-pm-response.normalized.backlog.json`
      );
      const backlogDraft = await readBacklogDraftFile(normalizedBacklogPath, {
        invalidJsonPrefix: 'Invalid backlog JSON',
        invalidShapePrefix: 'Invalid backlog draft for export'
      });

      await exportBacklogItems(
        backlogDraft,
        normalizedBacklogPath,
        resolve(process.cwd(), DEMO_EXPORT_DIRECTORY)
      );
    }
  },
  {
    label: 'Run project status',
    run: async () => {
      const outputsDirectory = resolve(process.cwd(), DEMO_OUTPUT_DIRECTORY);
      const status = await collectProjectStatus(outputsDirectory);
      await writeProjectStatus(status, outputsDirectory);
    }
  },
  {
    label: 'Run specialist response check',
    run: async () => {
      const sourcePath = resolve(process.cwd(), DEMO_SPECIALIST_RESPONSE_PATH);
      const markdown = await readFile(sourcePath, 'utf8');
      const report = checkSpecialistResponse(markdown, sourcePath);

      await writeSpecialistCheckReport(
        report,
        resolve(process.cwd(), DEMO_SPECIALIST_CHECK_DIRECTORY),
        'frontend-story-002.specialist-check'
      );
    }
  },
  {
    label: 'Close demo delivery run',
    run: async () => {
      const sourcePath = resolve(process.cwd(), DEMO_DELIVERY_RUN_PATH);
      const rawInput = await readJsonFileSafe(sourcePath, 'Invalid delivery closure JSON');
      const input = parseDeliveryClosureInput(rawInput);
      const result = closeDeliveryRun(input);

      await writeDeliveryClosureResult(
        result,
        resolve(process.cwd(), DEMO_DELIVERY_OUTPUT_DIRECTORY),
        'sample-delivery-run.delivery-closure'
      );
    }
  },
  {
    label: 'Run demo execution loop',
    run: async () => {
      const sourcePath = resolve(process.cwd(), DEMO_EXECUTION_LOOP_PATH);
      const rawInput = await readJsonFileSafe(sourcePath, 'Invalid execution loop JSON');
      const input = parseExecutionLoopInput(rawInput);
      const report = await runExecutionLoop(input);

      await writeExecutionLoopReport(
        report,
        resolve(process.cwd(), DEMO_EXECUTION_LOOP_OUTPUT_DIRECTORY),
        'sample-execution-loop.execution-loop'
      );
    }
  },
  {
    label: 'Observe demo run',
    run: async () => {
      const sourcePath = resolve(process.cwd(), DEMO_OBSERVABLE_RUN_PATH);
      const rawInput = await readJsonFileSafe(sourcePath, 'Invalid observable run JSON');
      const input = parseObservableRunInput(rawInput);
      const report = observeRun(input);

      await writeObservableRunReport(
        report,
        resolve(process.cwd(), DEMO_OBSERVABILITY_OUTPUT_DIRECTORY),
        'sample-observable-run.run-observability'
      );
    }
  },
  {
    label: 'Evaluate demo quality gate',
    run: async () => {
      const sourcePath = resolve(process.cwd(), DEMO_QUALITY_GATE_PATH);
      const rawInput = await readJsonFileSafe(sourcePath, 'Invalid quality gate JSON');
      const input = parseQualityGateInput(rawInput);
      const report = evaluateQualityGate(input);

      await writeQualityGateReport(
        report,
        resolve(process.cwd(), DEMO_QUALITY_GATE_OUTPUT_DIRECTORY),
        'sample-quality-gate.quality-gate'
      );
    }
  },
  {
    label: 'Plan demo delegation',
    run: async () => {
      const sourcePath = resolve(process.cwd(), DEMO_DELEGATION_PLAN_PATH);
      const rawInput = await readJsonFileSafe(sourcePath, 'Invalid delegation plan JSON');
      const input = parseDelegationPlanInput(rawInput);
      const report = planDelegation(input);

      await writeDelegationPlanReport(
        report,
        resolve(process.cwd(), DEMO_DELEGATION_PLAN_OUTPUT_DIRECTORY),
        'sample-delegation-plan.delegation-plan'
      );
    }
  },
  {
    label: 'Execute demo delivery graph',
    run: async () => {
      const sourcePath = resolve(process.cwd(), DEMO_GRAPH_EXECUTION_PATH);
      const rawInput = await readJsonFileSafe(sourcePath, 'Invalid graph execution JSON');
      const input = parseGraphExecutionInput(rawInput);
      const report = executeGraph(input);

      await writeGraphExecutionReport(
        report,
        resolve(process.cwd(), DEMO_GRAPH_EXECUTION_OUTPUT_DIRECTORY),
        'sample-graph-execution.graph-execution'
      );
    }
  }
];

const EXPECTED_FILES: ExpectedFile[] = [
  { label: 'Deterministic backlog JSON', path: `${DEMO_OUTPUT_DIRECTORY}/brief.backlog.json` },
  { label: 'Deterministic backlog Markdown', path: `${DEMO_OUTPUT_DIRECTORY}/brief.backlog.md` },
  { label: 'PO/PM prompt Markdown', path: `${DEMO_OUTPUT_DIRECTORY}/brief.po-pm.prompt.md` },
  { label: 'Normalized backlog JSON', path: `${DEMO_OUTPUT_DIRECTORY}/po-pm-response.normalized.backlog.json` },
  { label: 'Normalized backlog Markdown', path: `${DEMO_OUTPUT_DIRECTORY}/po-pm-response.normalized.backlog.md` },
  { label: 'Backlog review JSON', path: `${DEMO_OUTPUT_DIRECTORY}/backlog-review.json` },
  { label: 'Backlog review Markdown', path: `${DEMO_OUTPUT_DIRECTORY}/backlog-review.md` },
  { label: 'Export manifest', path: `${DEMO_EXPORT_DIRECTORY}/manifest.json` },
  { label: 'Project status JSON', path: `${DEMO_OUTPUT_DIRECTORY}/project-status.json` },
  { label: 'Specialist check JSON', path: `${DEMO_SPECIALIST_CHECK_DIRECTORY}/frontend-story-002.specialist-check.json` },
  { label: 'Specialist check Markdown', path: `${DEMO_SPECIALIST_CHECK_DIRECTORY}/frontend-story-002.specialist-check.md` },
  { label: 'Delivery closure JSON', path: `${DEMO_DELIVERY_OUTPUT_DIRECTORY}/sample-delivery-run.delivery-closure.json` },
  { label: 'Delivery dossier Markdown', path: `${DEMO_DELIVERY_OUTPUT_DIRECTORY}/sample-delivery-run.delivery-closure.md` },
  { label: 'Delivery notification Markdown', path: `${DEMO_DELIVERY_OUTPUT_DIRECTORY}/sample-delivery-run.delivery-closure.notification.md` },
  { label: 'Execution loop JSON', path: `${DEMO_EXECUTION_LOOP_OUTPUT_DIRECTORY}/sample-execution-loop.execution-loop.json` },
  { label: 'Execution loop Markdown', path: `${DEMO_EXECUTION_LOOP_OUTPUT_DIRECTORY}/sample-execution-loop.execution-loop.md` },
  { label: 'Run observability JSON', path: `${DEMO_OBSERVABILITY_OUTPUT_DIRECTORY}/sample-observable-run.run-observability.json` },
  { label: 'Run observability Markdown', path: `${DEMO_OBSERVABILITY_OUTPUT_DIRECTORY}/sample-observable-run.run-observability.md` },
  { label: 'Quality gate JSON', path: `${DEMO_QUALITY_GATE_OUTPUT_DIRECTORY}/sample-quality-gate.quality-gate.json` },
  { label: 'Quality gate Markdown', path: `${DEMO_QUALITY_GATE_OUTPUT_DIRECTORY}/sample-quality-gate.quality-gate.md` },
  { label: 'Delegation plan JSON', path: `${DEMO_DELEGATION_PLAN_OUTPUT_DIRECTORY}/sample-delegation-plan.delegation-plan.json` },
  { label: 'Delegation plan Markdown', path: `${DEMO_DELEGATION_PLAN_OUTPUT_DIRECTORY}/sample-delegation-plan.delegation-plan.md` },
  { label: 'Graph execution JSON', path: `${DEMO_GRAPH_EXECUTION_OUTPUT_DIRECTORY}/sample-graph-execution.graph-execution.json` },
  { label: 'Graph execution Markdown', path: `${DEMO_GRAPH_EXECUTION_OUTPUT_DIRECTORY}/sample-graph-execution.graph-execution.md` }
];

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(resolve(process.cwd(), filePath));
    return true;
  } catch {
    return false;
  }
}

async function countExportedMarkdownItems(): Promise<number> {
  try {
    const entries = await readdir(resolve(process.cwd(), DEMO_EXPORT_DIRECTORY), {
      withFileTypes: true
    });
    return entries.filter((entry) => entry.isFile() && entry.name.endsWith('.md')).length;
  } catch {
    return 0;
  }
}

/** Reads a JSON file for validation purposes; returns undefined on any error. */
async function tryReadJsonFile(filePath: string): Promise<unknown | undefined> {
  try {
    return await readJsonFileSafe(resolve(process.cwd(), filePath), 'Invalid JSON');
  } catch {
    return undefined;
  }
}

async function collectSummary(): Promise<DemoValidationSummary> {
  const expectedFiles = await Promise.all(
    EXPECTED_FILES.map(async (file) => ({
      ...file,
      exists: await fileExists(file.path)
    }))
  );

  const exportedMarkdownItemCount = await countExportedMarkdownItems();
  const statusReport = await tryReadJsonFile(`${DEMO_OUTPUT_DIRECTORY}/project-status.json`);
  const statusSuccess = Boolean(
    statusReport &&
      typeof statusReport === 'object' &&
      typeof (statusReport as { suggestedNextStep?: unknown }).suggestedNextStep === 'string'
  );

  const success =
    expectedFiles.every((file) => file.exists) && exportedMarkdownItemCount > 0 && statusSuccess;

  return {
    generatedAt: new Date().toISOString(),
    outputsDirectory: DEMO_OUTPUT_DIRECTORY,
    stepsRun: STEPS.length,
    expectedFiles,
    exportedMarkdownItemCount,
    success
  };
}

function renderSummary(summary: DemoValidationSummary): string[] {
  const lines = [
    'Demo workflow validation',
    `- Outputs directory: ${summary.outputsDirectory}`,
    `- Steps run: ${summary.stepsRun}`
  ];

  for (const file of summary.expectedFiles) {
    lines.push(`- ${file.label}: ${file.exists ? 'ok' : `missing (${file.path})`}`);
  }

  lines.push(`- Exported Markdown items: ${summary.exportedMarkdownItemCount}`);
  lines.push(
    `- Result: ${
      summary.success
        ? 'success - the demo workflow generated every expected artifact.'
        : 'failure - one or more expected demo artifacts are missing.'
    }`
  );

  return lines;
}

async function main(): Promise<void> {
  for (const step of STEPS) {
    await step.run();
  }

  const summary = await collectSummary();
  const projectStatus = await collectProjectStatus(resolve(process.cwd(), DEMO_OUTPUT_DIRECTORY));

  if (!summary.success) {
    throw new Error(renderSummary(summary).join('\n'));
  }

  logLines([...renderSummary(summary), ...renderProjectStatus(projectStatus)]);
}

main().catch((error: unknown) => {
  logFailure('Demo validation failed', error);
});
