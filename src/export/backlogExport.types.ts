export type ExportedBacklogItemFile = {
  id: string;
  title: string;
  type: 'epic' | 'story' | 'task' | 'risk';
  priority: 'low' | 'medium' | 'high';
  status: 'draft' | 'review' | 'ready' | 'done';
  ownerRole?:
    | 'po_pm'
    | 'ux_ui'
    | 'frontend'
    | 'backend'
    | 'qa'
    | 'tech_lead'
    | 'legal_compliance'
    | 'security'
    | 'devops'
    | 'data_analytics'
    | 'customer_success'
    | 'seo';
  parentId?: string;
  filePath: string;
  suggestedLabels: string[];
};

export type BacklogExportManifest = {
  sourceBacklogPath: string;
  exportedAt: string;
  exportedItemCount: number;
  files: ExportedBacklogItemFile[];
};

export type BacklogExportResult = {
  exportDirectory: string;
  manifestPath: string;
  files: ExportedBacklogItemFile[];
};

const EXPORTED_ITEM_TYPES = ['epic', 'story', 'task', 'risk'] as const;
const EXPORTED_ITEM_PRIORITIES = ['low', 'medium', 'high'] as const;
const EXPORTED_ITEM_STATUSES = ['draft', 'review', 'ready', 'done'] as const;
const EXPORTED_ITEM_OWNER_ROLES = [
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

const VALID_ITEM_TYPES = new Set(EXPORTED_ITEM_TYPES);
const VALID_ITEM_PRIORITIES = new Set(EXPORTED_ITEM_PRIORITIES);
const VALID_ITEM_STATUSES = new Set(EXPORTED_ITEM_STATUSES);
const VALID_ITEM_OWNER_ROLES = new Set(EXPORTED_ITEM_OWNER_ROLES);

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

export function validateExportedBacklogItemFile(
  value: unknown,
  path = 'files[]'
): string[] {
  const errors: string[] = [];

  if (!value || typeof value !== 'object') {
    return [`${path} must be an object.`];
  }

  const candidate = value as Partial<ExportedBacklogItemFile>;

  if (typeof candidate.id !== 'string') {
    errors.push(`${path}.id must be a string.`);
  }

  if (typeof candidate.title !== 'string') {
    errors.push(`${path}.title must be a string.`);
  }

  if (
    typeof candidate.type !== 'string' ||
    !VALID_ITEM_TYPES.has(candidate.type as ExportedBacklogItemFile['type'])
  ) {
    errors.push(`${path}.type must be one of: ${EXPORTED_ITEM_TYPES.join(', ')}.`);
  }

  if (
    typeof candidate.priority !== 'string' ||
    !VALID_ITEM_PRIORITIES.has(candidate.priority as ExportedBacklogItemFile['priority'])
  ) {
    errors.push(
      `${path}.priority must be one of: ${EXPORTED_ITEM_PRIORITIES.join(', ')}.`
    );
  }

  if (
    typeof candidate.status !== 'string' ||
    !VALID_ITEM_STATUSES.has(candidate.status as ExportedBacklogItemFile['status'])
  ) {
    errors.push(`${path}.status must be one of: ${EXPORTED_ITEM_STATUSES.join(', ')}.`);
  }

  if (
    candidate.ownerRole !== undefined &&
    (typeof candidate.ownerRole !== 'string' ||
      !VALID_ITEM_OWNER_ROLES.has(candidate.ownerRole as NonNullable<ExportedBacklogItemFile['ownerRole']>))
  ) {
    errors.push(
      `${path}.ownerRole must be one of: ${EXPORTED_ITEM_OWNER_ROLES.join(', ')} when present.`
    );
  }

  if (candidate.parentId !== undefined && typeof candidate.parentId !== 'string') {
    errors.push(`${path}.parentId must be a string when present.`);
  }

  if (typeof candidate.filePath !== 'string') {
    errors.push(`${path}.filePath must be a string.`);
  }

  if (!isStringArray(candidate.suggestedLabels)) {
    errors.push(`${path}.suggestedLabels must be an array of strings.`);
  }

  return errors;
}

export function validateBacklogExportManifest(value: unknown): string[] {
  const errors: string[] = [];

  if (!value || typeof value !== 'object') {
    return ['Backlog export manifest must be an object.'];
  }

  const candidate = value as Partial<BacklogExportManifest>;

  if (typeof candidate.sourceBacklogPath !== 'string') {
    errors.push('sourceBacklogPath must be a string.');
  }

  if (typeof candidate.exportedAt !== 'string') {
    errors.push('exportedAt must be a string.');
  }

  if (typeof candidate.exportedItemCount !== 'number') {
    errors.push('exportedItemCount must be a number.');
  }

  if (!Array.isArray(candidate.files)) {
    errors.push('files must be an array.');
  } else {
    candidate.files.forEach((file, index) => {
      errors.push(...validateExportedBacklogItemFile(file, `files[${index}]`));
    });
  }

  return errors;
}

export function assertBacklogExportManifest(
  value: unknown
): asserts value is BacklogExportManifest {
  const errors = validateBacklogExportManifest(value);

  if (errors.length > 0) {
    throw new Error(
      `Backlog export manifest does not match the expected shape:\n- ${errors.join('\n- ')}`
    );
  }
}
