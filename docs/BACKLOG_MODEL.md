# Backlog Model

## Role Of The Backlog

The backlog is the shared coordination layer for all agents and humans. It should be easier to review than a long chat transcript and stable enough to automate later.

## Item Types

- `epic`: a coherent outcome area
- `story`: a user or business need
- `task`: a concrete implementation or delivery action
- `risk`: a known uncertainty or dependency

## Minimum Item Shape

```ts
type BacklogItem = {
  id: string;
  parentId?: string;
  type: 'epic' | 'story' | 'task' | 'risk';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'draft' | 'review' | 'ready' | 'done';
  ownerRole?: 'po_pm' | 'ux_ui' | 'frontend' | 'backend' | 'qa' | 'tech_lead';
  acceptanceCriteria?: string[];
  assumptions?: string[];
  notes?: string[];
};
```

## Interaction Model

- PO/PM creates epics and stories
- UX/UI adds flow, content, and interface notes
- Front-end adds UI implementation tasks
- Back-end adds service or data tasks
- QA adds validation and risk notes
- Tech Lead can re-sequence or flag dependencies

## Quality Rules

A backlog item is ready for review when it has:

- a clear title
- a useful description
- a priority
- an owner role when relevant
- acceptance criteria for user-facing work

## Example

```json
{
  "id": "story-001",
  "type": "story",
  "title": "Show a clear homepage value proposition",
  "description": "As a visitor, I want to understand the offer in a few seconds.",
  "priority": "high",
  "status": "review",
  "ownerRole": "po_pm",
  "acceptanceCriteria": [
    "The page states who the service is for.",
    "A primary call to action is visible immediately."
  ],
  "assumptions": [
    "The project starts with a marketing website."
  ]
}
```
