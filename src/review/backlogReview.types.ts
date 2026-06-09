export type BacklogReviewSeverity = 'warning' | 'info';

export type BacklogReviewFinding = {
  ruleId: string;
  severity: BacklogReviewSeverity;
  message: string;
  itemId?: string;
  itemTitle?: string;
};

export type BacklogReviewReport = {
  projectName: string;
  sourceBacklog: string;
  reviewedAt: string;
  summary: {
    warnings: number;
    infos: number;
    totalFindings: number;
  };
  findings: BacklogReviewFinding[];
};
