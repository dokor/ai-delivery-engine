export type BriefSectionName =
  | 'project'
  | 'summary'
  | 'goals'
  | 'audience'
  | 'pages'
  | 'constraints'
  | 'success criteria'
  | 'notes'
  | 'type';

export type BriefMode = 'new-product' | 'existing-iteration';

export type ParsedBrief = {
  title: string;
  summary: string;
  goals: string[];
  audience: string[];
  pages: string[];
  constraints: string[];
  successCriteria: string[];
  notes?: string[];
  mode?: BriefMode;
  sections?: Partial<Record<BriefSectionName, string[]>>;
  raw: string;
};
