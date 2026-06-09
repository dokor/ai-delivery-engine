export const BACKLOG_ITEM_TYPES = ['epic', 'story', 'task', 'risk'] as const;
export const BACKLOG_PRIORITIES = ['low', 'medium', 'high'] as const;
export const BACKLOG_STATUSES = ['draft', 'review', 'ready', 'done'] as const;
export const BACKLOG_OWNER_ROLES = [
  'po_pm',
  'ux_ui',
  'frontend',
  'backend',
  'qa',
  'tech_lead'
] as const;

export type BacklogItemType = (typeof BACKLOG_ITEM_TYPES)[number];
export type BacklogPriority = (typeof BACKLOG_PRIORITIES)[number];
export type BacklogStatus = (typeof BACKLOG_STATUSES)[number];
export type BacklogOwnerRole = (typeof BACKLOG_OWNER_ROLES)[number];

export type BacklogItem = {
  id: string;
  parentId?: string;
  type: BacklogItemType;
  title: string;
  description: string;
  priority: BacklogPriority;
  status: BacklogStatus;
  ownerRole?: BacklogOwnerRole;
  acceptanceCriteria?: string[];
  assumptions?: string[];
  notes?: string[];
};

export type BacklogDraft = {
  projectName: string;
  projectSummary: string;
  generatedAt: string;
  sourceBrief: string;
  assumptions: string[];
  questions: string[];
  items: BacklogItem[];
};

const VALID_TYPES = new Set<BacklogItemType>(BACKLOG_ITEM_TYPES);
const VALID_PRIORITIES = new Set<BacklogPriority>(BACKLOG_PRIORITIES);
const VALID_STATUSES = new Set<BacklogStatus>(BACKLOG_STATUSES);
const VALID_OWNER_ROLES = new Set<BacklogOwnerRole>(BACKLOG_OWNER_ROLES);

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

export function isBacklogItem(value: unknown): value is BacklogItem {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<BacklogItem>;

  return (
    typeof candidate.id === 'string' &&
    (candidate.parentId === undefined || typeof candidate.parentId === 'string') &&
    typeof candidate.title === 'string' &&
    typeof candidate.description === 'string' &&
    typeof candidate.type === 'string' &&
    VALID_TYPES.has(candidate.type as BacklogItemType) &&
    typeof candidate.priority === 'string' &&
    VALID_PRIORITIES.has(candidate.priority as BacklogPriority) &&
    typeof candidate.status === 'string' &&
    VALID_STATUSES.has(candidate.status as BacklogStatus) &&
    (candidate.ownerRole === undefined ||
      (typeof candidate.ownerRole === 'string' &&
        VALID_OWNER_ROLES.has(candidate.ownerRole as BacklogOwnerRole))) &&
    (candidate.acceptanceCriteria === undefined || isStringArray(candidate.acceptanceCriteria)) &&
    (candidate.assumptions === undefined || isStringArray(candidate.assumptions)) &&
    (candidate.notes === undefined || isStringArray(candidate.notes))
  );
}

export function assertBacklogDraft(value: unknown): asserts value is BacklogDraft {
  if (!value || typeof value !== 'object') {
    throw new Error('Backlog draft must be an object.');
  }

  const candidate = value as Partial<BacklogDraft>;

  if (
    typeof candidate.projectName !== 'string' ||
    typeof candidate.projectSummary !== 'string' ||
    typeof candidate.generatedAt !== 'string' ||
    typeof candidate.sourceBrief !== 'string' ||
    !isStringArray(candidate.assumptions) ||
    !isStringArray(candidate.questions) ||
    !Array.isArray(candidate.items) ||
    !candidate.items.every((item) => isBacklogItem(item))
  ) {
    throw new Error('Backlog draft does not match the expected shape.');
  }
}
