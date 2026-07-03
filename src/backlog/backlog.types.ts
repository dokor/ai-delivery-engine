export const BACKLOG_ITEM_TYPES = ['epic', 'story', 'task', 'risk'] as const;
export const BACKLOG_PRIORITIES = ['low', 'medium', 'high'] as const;
export const BACKLOG_STATUSES = ['draft', 'review', 'ready', 'done'] as const;
export const BACKLOG_OWNER_ROLES = [
  'po_pm',
  'ux_ui',
  'frontend',
  'backend',
  'qa',
  'tech_lead',
  'legal_compliance',
  'security',
  'devops',
  'data_analytics',
  'customer_success',
  'seo'
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

function pushStringArrayErrors(errors: string[], path: string, value: unknown): void {
  if (!isStringArray(value)) {
    errors.push(`${path} must be an array of strings.`);
  }
}

export function validateBacklogItem(value: unknown, path = 'items[]'): string[] {
  const errors: string[] = [];

  if (!value || typeof value !== 'object') {
    return [`${path} must be an object.`];
  }

  const candidate = value as Partial<BacklogItem>;

  if (typeof candidate.id !== 'string') {
    errors.push(`${path}.id must be a string.`);
  }

  if (candidate.parentId !== undefined && typeof candidate.parentId !== 'string') {
    errors.push(`${path}.parentId must be a string when present.`);
  }

  if (typeof candidate.title !== 'string') {
    errors.push(`${path}.title must be a string.`);
  }

  if (typeof candidate.description !== 'string') {
    errors.push(`${path}.description must be a string.`);
  }

  if (typeof candidate.type !== 'string' || !VALID_TYPES.has(candidate.type as BacklogItemType)) {
    errors.push(
      `${path}.type must be one of: ${BACKLOG_ITEM_TYPES.join(', ')}.`
    );
  }

  if (
    typeof candidate.priority !== 'string' ||
    !VALID_PRIORITIES.has(candidate.priority as BacklogPriority)
  ) {
    errors.push(
      `${path}.priority must be one of: ${BACKLOG_PRIORITIES.join(', ')}.`
    );
  }

  if (
    typeof candidate.status !== 'string' ||
    !VALID_STATUSES.has(candidate.status as BacklogStatus)
  ) {
    errors.push(
      `${path}.status must be one of: ${BACKLOG_STATUSES.join(', ')}.`
    );
  }

  if (
    candidate.ownerRole !== undefined &&
    (typeof candidate.ownerRole !== 'string' ||
      !VALID_OWNER_ROLES.has(candidate.ownerRole as BacklogOwnerRole))
  ) {
    errors.push(
      `${path}.ownerRole must be one of: ${BACKLOG_OWNER_ROLES.join(', ')} when present.`
    );
  }

  if (candidate.acceptanceCriteria !== undefined) {
    pushStringArrayErrors(errors, `${path}.acceptanceCriteria`, candidate.acceptanceCriteria);
  }

  if (candidate.assumptions !== undefined) {
    pushStringArrayErrors(errors, `${path}.assumptions`, candidate.assumptions);
  }

  if (candidate.notes !== undefined) {
    pushStringArrayErrors(errors, `${path}.notes`, candidate.notes);
  }

  return errors;
}

export function isBacklogItem(value: unknown): value is BacklogItem {
  return validateBacklogItem(value).length === 0;
}

export function validateBacklogDraft(value: unknown): string[] {
  const errors: string[] = [];

  if (!value || typeof value !== 'object') {
    return ['Backlog draft must be an object.'];
  }

  const candidate = value as Partial<BacklogDraft>;

  if (typeof candidate.projectName !== 'string') {
    errors.push('projectName must be a string.');
  }

  if (typeof candidate.projectSummary !== 'string') {
    errors.push('projectSummary must be a string.');
  }

  if (typeof candidate.generatedAt !== 'string') {
    errors.push('generatedAt must be a string.');
  }

  if (typeof candidate.sourceBrief !== 'string') {
    errors.push('sourceBrief must be a string.');
  }

  if (!isStringArray(candidate.assumptions)) {
    errors.push('assumptions must be an array of strings.');
  }

  if (!isStringArray(candidate.questions)) {
    errors.push('questions must be an array of strings.');
  }

  if (!Array.isArray(candidate.items)) {
    errors.push('items must be an array.');
  } else {
    candidate.items.forEach((item, index) => {
      errors.push(...validateBacklogItem(item, `items[${index}]`));
    });
  }

  return errors;
}

export function assertBacklogDraft(value: unknown): asserts value is BacklogDraft {
  const errors = validateBacklogDraft(value);

  if (errors.length > 0) {
    throw new Error(`Backlog draft does not match the expected shape:\n- ${errors.join('\n- ')}`);
  }
}
