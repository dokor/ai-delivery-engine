import type { BacklogDraft, BacklogItem } from '../backlog/backlog.types.ts';
import type { BacklogReviewFinding, BacklogReviewReport } from './backlogReview.types.ts';

function createFinding(
  ruleId: string,
  severity: BacklogReviewFinding['severity'],
  message: string,
  item?: BacklogItem
): BacklogReviewFinding {
  return {
    ruleId,
    severity,
    message,
    itemId: item?.id,
    itemTitle: item?.title
  };
}

function hasUsefulDescription(value: string): boolean {
  const trimmed = value.trim();

  return trimmed.length >= 24 && trimmed.split(/\s+/).length >= 4;
}

export function reviewBacklog(backlogDraft: BacklogDraft, sourceBacklog: string): BacklogReviewReport {
  const findings: BacklogReviewFinding[] = [];
  const itemsById = new Map(backlogDraft.items.map((item) => [item.id, item]));
  const stories = backlogDraft.items.filter((item) => item.type === 'story');
  const tasks = backlogDraft.items.filter((item) => item.type === 'task');
  const risks = backlogDraft.items.filter((item) => item.type === 'risk');

  if (backlogDraft.assumptions.length === 0) {
    findings.push(
      createFinding(
        'missing-project-assumptions',
        'warning',
        'The backlog has no project-level assumptions. Add at least one explicit assumption for review context.'
      )
    );
  }

  if (backlogDraft.questions.length === 0) {
    findings.push(
      createFinding(
        'missing-open-questions',
        'warning',
        'The backlog has no open questions. Capture unresolved product or scope questions before implementation planning.'
      )
    );
  }

  if (risks.length === 0) {
    findings.push(
      createFinding(
        'missing-risks',
        'info',
        'No risk items were captured. Consider whether the backlog should record at least one known risk or dependency.'
      )
    );
  }

  for (const item of backlogDraft.items) {
    if (!hasUsefulDescription(item.description)) {
      findings.push(
        createFinding(
          'weak-description',
          'warning',
          'This item has a missing or weak description. Use a description that explains the delivery intent clearly.',
          item
        )
      );
    }
  }

  for (const story of stories) {
    if (!story.acceptanceCriteria || story.acceptanceCriteria.length === 0) {
      findings.push(
        createFinding(
          'missing-acceptance-criteria',
          'warning',
          'This story has no acceptance criteria.',
          story
        )
      );
    }

    const parent = story.parentId ? itemsById.get(story.parentId) : undefined;
    if (!parent || parent.type !== 'epic') {
      findings.push(
        createFinding(
          'orphan-story',
          'warning',
          'This story is not linked to a valid parent epic.',
          story
        )
      );
    }
  }

  for (const task of tasks) {
    if (!task.ownerRole) {
      findings.push(
        createFinding(
          'missing-task-owner',
          'warning',
          'This task has no owner role.',
          task
        )
      );
    }

    const parent = task.parentId ? itemsById.get(task.parentId) : undefined;
    if (!parent || parent.type !== 'story') {
      findings.push(
        createFinding(
          'orphan-task',
          'warning',
          'This task is not linked to a valid parent story.',
          task
        )
      );
    }
  }

  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const infos = findings.filter((finding) => finding.severity === 'info').length;

  return {
    projectName: backlogDraft.projectName,
    sourceBacklog,
    reviewedAt: new Date().toISOString(),
    summary: {
      warnings,
      infos,
      totalFindings: findings.length
    },
    findings
  };
}
