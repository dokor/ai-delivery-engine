import {
  BACKLOG_ITEM_TYPES,
  BACKLOG_OWNER_ROLES,
  BACKLOG_PRIORITIES,
  BACKLOG_STATUSES,
  type BacklogDraft
} from '../backlog/backlog.types.ts';

export type PoPmAiOutput = BacklogDraft;

export const PO_PM_OUTPUT_CONTRACT = {
  rootRequiredFields: [
    'projectName',
    'projectSummary',
    'generatedAt',
    'sourceBrief',
    'assumptions',
    'questions',
    'items'
  ],
  backlogItemRequiredFields: ['id', 'type', 'title', 'description', 'priority', 'status'],
  backlogItemOptionalFields: ['parentId', 'ownerRole', 'acceptanceCriteria', 'assumptions', 'notes'],
  allowedItemTypes: BACKLOG_ITEM_TYPES,
  allowedPriorities: BACKLOG_PRIORITIES,
  allowedStatuses: BACKLOG_STATUSES,
  allowedOwnerRoles: BACKLOG_OWNER_ROLES
} as const;

export function buildPoPmOutputJsonShapeExample(): string {
  return `{
  "projectName": "string",
  "projectSummary": "string",
  "generatedAt": "ISO-8601 string",
  "sourceBrief": "string",
  "assumptions": ["string"],
  "questions": ["string"],
  "items": [
    {
      "id": "epic-001",
      "type": "epic",
      "title": "string",
      "description": "string",
      "priority": "high",
      "status": "review",
      "ownerRole": "po_pm",
      "notes": ["optional string"]
    }
  ]
}`;
}
