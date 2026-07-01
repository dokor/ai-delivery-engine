export type GitHubLabel = {
  id: number;
  name: string;
  color: string;
};

export type GitHubIssue = {
  number: number;
  title: string;
  body: string;
  labels: string[];
  state: 'open' | 'closed';
  url: string;
};

export type GitHubPR = {
  number: number;
  title: string;
  body: string;
  url: string;
  headRefName: string;
  state: 'open' | 'closed' | 'merged';
};

export type EnrichmentResult = {
  issueNumber: number;
  enrichedBody: string;
  suggestedLabels: string[];
  shouldSplit: boolean;
  subIssues: Array<{ title: string; body: string }>;
};

export type PRCreationOptions = {
  title: string;
  body: string;
  headBranch: string;
  baseBranch?: string;
  draft?: boolean;
  labels?: string[];
};

export type SpecialistReview = {
  role: string;
  summary: string;
  findings: string[];
  correctionsMade: string[];
};
