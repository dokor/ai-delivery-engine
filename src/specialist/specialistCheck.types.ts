export type SpecialistCheckSeverity = 'error' | 'warning' | 'info';

export type SpecialistCheckFinding = {
  code: string;
  severity: SpecialistCheckSeverity;
  message: string;
  section?: string;
};

export type SpecialistCheckReport = {
  sourceFile: string;
  checkedAt: string;
  detectedRole?: string;
  backlogItemIds: string[];
  findingsCount: number;
  findings: SpecialistCheckFinding[];
};
