export type BriefSectionName =
  | 'project'
  | 'summary'
  | 'goals'
  | 'audience'
  | 'pages'
  | 'constraints'
  | 'success criteria'
  | 'notes';

export type ParsedBrief = {
  title: string;
  summary: string;
  goals: string[];
  audience: string[];
  pages: string[];
  constraints: string[];
  successCriteria: string[];
  notes: string[];
  sections: Partial<Record<BriefSectionName, string[]>>;
  raw: string;
};
