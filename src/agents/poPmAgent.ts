import type { BriefMode, ParsedBrief } from '../briefs/brief.types.ts';
import type {
  BacklogDraft,
  BacklogItem,
  BacklogOwnerRole,
  BacklogPriority
} from '../backlog/backlog.types.ts';

type ItemFactory = {
  createEpic(input: Omit<BacklogItem, 'id' | 'type' | 'status'>): BacklogItem;
  createStory(input: Omit<BacklogItem, 'id' | 'type' | 'status'>): BacklogItem;
  createTask(input: Omit<BacklogItem, 'id' | 'type' | 'status'>): BacklogItem;
  createRisk(input: Omit<BacklogItem, 'id' | 'type' | 'status'>): BacklogItem;
};

function createItemFactory(): ItemFactory {
  let sequence = 0;

  function createItem(
    type: BacklogItem['type'],
    input: Omit<BacklogItem, 'id' | 'type' | 'status'>
  ): BacklogItem {
    sequence += 1;

    return {
      id: `${type}-${String(sequence).padStart(3, '0')}`,
      type,
      status: 'review',
      ...input
    };
  }

  return {
    createEpic: (input) => createItem('epic', input),
    createStory: (input) => createItem('story', input),
    createTask: (input) => createItem('task', input),
    createRisk: (input) => createItem('risk', input)
  };
}

function resolveMode(brief: ParsedBrief): BriefMode {
  return brief.mode ?? 'new-product';
}

function pickPrimaryAudience(brief: ParsedBrief): string {
  return brief.audience[0] ?? 'the primary audience';
}

function formatOwnerRole(value: BacklogOwnerRole): string {
  switch (value) {
    case 'po_pm':
      return 'PO/PM';
    case 'ux_ui':
      return 'UX/UI';
    case 'frontend':
      return 'Front-end';
    case 'backend':
      return 'Back-end';
    case 'qa':
      return 'QA';
    case 'tech_lead':
      return 'Tech Lead';
    case 'legal_compliance':
      return 'Legal & Compliance';
    case 'security':
      return 'Security';
    case 'devops':
      return 'DevOps';
    case 'data_analytics':
      return 'Data & Analytics';
    case 'customer_success':
      return 'Customer Success';
    case 'seo':
      return 'SEO';
  }
}

// Keywords that indicate a scope item has a UI surface
const UI_SCOPE_KEYWORDS = [
  'ui', 'ux', 'front', 'page', 'view', 'screen', 'interface',
  'display', 'export', 'pdf', 'comparaison', 'rapport', 'share',
  'partage', 'component', 'dashboard', 'form', 'button', 'modal',
  'history', 'historique', 'landing', 'home'
];

function isScopeItemUiFacing(item: string): boolean {
  const lower = item.toLowerCase();
  return UI_SCOPE_KEYWORDS.some((k) => lower.includes(k));
}

function shouldIncludeUxTask(item: string, mode: BriefMode): boolean {
  return mode === 'new-product' || isScopeItemUiFacing(item);
}

function buildAssumptions(brief: ParsedBrief): string[] {
  const mode = resolveMode(brief);
  const assumptions = [
    mode === 'existing-iteration'
      ? 'This iteration should respect existing functionality and API contracts — changes must not introduce regressions.'
      : `The first MVP should stay intentionally small and focused on a usable first delivery backlog for ${pickPrimaryAudience(brief)}.`
  ];

  if (brief.pages.length > 0) {
    const label = mode === 'existing-iteration' ? 'planned scope items' : 'core surfaces';
    assumptions.push(`The ${mode === 'existing-iteration' ? 'iteration' : 'initial'} scope includes these ${label}: ${brief.pages.join(', ')}.`);
  }

  if (brief.constraints.length > 0) {
    assumptions.push(`The backlog should respect the stated constraints: ${brief.constraints.join('; ')}.`);
  }

  return assumptions;
}

function buildQuestions(brief: ParsedBrief): string[] {
  const questions: string[] = [];

  if (brief.audience.length === 0) {
    questions.push('Who is the primary audience for the first release?');
  }

  if (brief.pages.length === 0) {
    questions.push('Which pages or surfaces are required for the first release?');
  }

  if (brief.successCriteria.length === 0) {
    questions.push('How will the team judge that the first release is successful?');
  }

  if (brief.constraints.length === 0) {
    questions.push('Are there any timeline, branding, or technical constraints that should affect prioritization?');
  }

  return questions;
}

function createScopeItemStoryTitle(item: string, mode: BriefMode): string {
  if (mode === 'existing-iteration') return `Implement ${item}`;
  return `Define and deliver the ${item} experience`;
}

function createScopeItemStoryDescription(item: string, audience: string, mode: BriefMode): string {
  if (mode === 'existing-iteration') {
    return `Deliver the planned work for: ${item}. Define the acceptance criteria, implementation approach, and review checkpoints before implementation starts.`;
  }
  return `As a target visitor from ${audience}, I want the ${item} experience to be clear and actionable so I can move through the project journey without confusion.`;
}

function createTaskDescription(scopeItem: string, ownerRole: BacklogOwnerRole): string {
  switch (ownerRole) {
    case 'ux_ui':
      return `Outline the content structure, key user actions, and UX risks for the ${scopeItem} experience.`;
    case 'frontend':
      return `Break the ${scopeItem} experience into implementation-ready UI tasks and component work.`;
    case 'backend':
      return `Check whether the ${scopeItem} experience needs forms, integrations, or structured data support.`;
    case 'qa':
      return `Prepare review checks for the ${scopeItem} experience, including acceptance coverage and regression notes.`;
    default:
      return `Add delivery notes for the ${scopeItem} experience.`;
  }
}

function createIterationTaskDescription(scopeItem: string, ownerRole: BacklogOwnerRole): string {
  switch (ownerRole) {
    case 'ux_ui':
      return `Review the user-facing impact of this change and flag any UX or content concerns: ${scopeItem}.`;
    case 'frontend':
      return `Plan the frontend implementation for: ${scopeItem}. Break into component or integration tasks.`;
    case 'backend':
      return `Design the backend approach for: ${scopeItem}. Define API changes, data model impact, and error handling.`;
    case 'qa':
      return `Define acceptance checks and regression tests for: ${scopeItem}.`;
    default:
      return `Add delivery notes for: ${scopeItem}.`;
  }
}

function getExperienceEpicTitle(mode: BriefMode): string {
  return mode === 'existing-iteration' ? 'Deliver the planned scope' : 'Design the core user journey';
}

function getExperienceEpicDescription(audience: string, mode: BriefMode, primaryGoal: string): string {
  if (mode === 'existing-iteration') {
    return `Implement the planned improvements and features for this iteration: ${primaryGoal}.`;
  }
  return `Define the first-release experiences that matter most to ${audience}.`;
}

export function runPoPmAgent(brief: ParsedBrief, sourceBrief: string): BacklogDraft {
  const mode = resolveMode(brief);
  const summary =
    brief.summary || `Backlog draft generated from the brief for ${brief.title}.`;
  const assumptions = buildAssumptions(brief);
  const questions = buildQuestions(brief);
  const itemFactory = createItemFactory();
  const items: BacklogItem[] = [];
  const audience = pickPrimaryAudience(brief);
  const primaryGoal = brief.goals[0] ?? 'deliver a clear first release';

  const positioningEpic = itemFactory.createEpic({
    title: 'Clarify the product scope and value',
    description: `Turn the brief into a clear first-release direction for this goal: ${primaryGoal}`,
    priority: 'high',
    ownerRole: 'po_pm',
    assumptions
  });
  items.push(positioningEpic);

  const positioningStory = itemFactory.createStory({
    parentId: positioningEpic.id,
    title: 'Create a reviewable product backlog draft',
    description: `As the PO/PM role, I want the brief translated into a structured backlog so the team can review scope before implementation starts.`,
    priority: 'high',
    ownerRole: 'po_pm',
    acceptanceCriteria: [
      'The backlog contains epics, stories, and tasks.',
      'The first-release scope is explicit enough for human review.',
      'Open questions and assumptions are captured alongside the draft.'
    ],
    assumptions
  });
  items.push(positioningStory);

  const foundationalTasks: Array<{ title: string; ownerRole: BacklogOwnerRole; description: string }> = [
    {
      title: 'Review the brief and confirm first-release scope',
      ownerRole: 'po_pm',
      description: 'Confirm the smallest useful scope that can move forward to specialist review.'
    },
    {
      title: 'Highlight UX and content risks in the first-release journey',
      ownerRole: 'ux_ui',
      description: 'Identify the most important clarity and content gaps before implementation planning.'
    },
    {
      title: 'Prepare a delivery review checklist for the generated backlog',
      ownerRole: 'qa',
      description: 'Define what must be reviewed before stories are treated as ready for implementation.'
    }
  ];

  for (const task of foundationalTasks) {
    items.push(
      itemFactory.createTask({
        parentId: positioningStory.id,
        title: task.title,
        description: task.description,
        priority: 'high',
        ownerRole: task.ownerRole
      })
    );
  }

  const scopeItems = brief.pages.length > 0 ? brief.pages : ['homepage', 'contact flow'];

  const experienceEpic = itemFactory.createEpic({
    title: getExperienceEpicTitle(mode),
    description: getExperienceEpicDescription(audience, mode, primaryGoal),
    priority: 'high',
    ownerRole: 'po_pm',
    notes: brief.successCriteria
  });
  items.push(experienceEpic);

  for (const scopeItem of scopeItems) {
    const normalizedItem = scopeItem.toLowerCase();
    const storyPriority: BacklogPriority =
      normalizedItem.includes('home') || normalizedItem.includes('landing') ? 'high' : 'medium';

    const story = itemFactory.createStory({
      parentId: experienceEpic.id,
      title: createScopeItemStoryTitle(scopeItem, mode),
      description: createScopeItemStoryDescription(scopeItem, audience, mode),
      priority: storyPriority,
      ownerRole: 'po_pm',
      acceptanceCriteria:
        mode === 'existing-iteration'
          ? [
              `The implementation approach for "${scopeItem}" is documented.`,
              `Acceptance criteria are defined before implementation starts.`,
              `The next specialist roles can add detail without rewriting the scope.`
            ]
          : [
              `The purpose of the ${scopeItem} experience is explicit.`,
              `The ${scopeItem} experience supports the first-release goal.`,
              `The next specialist roles can add implementation detail without rewriting the scope.`
            ]
    });
    items.push(story);

    const followUpRoles: BacklogOwnerRole[] = ['ux_ui', 'frontend', 'backend', 'qa'];
    for (const ownerRole of followUpRoles) {
      // In existing-iteration mode, skip UX/UI tasks for non-UI scope items
      if (ownerRole === 'ux_ui' && !shouldIncludeUxTask(scopeItem, mode)) {
        continue;
      }

      items.push(
        itemFactory.createTask({
          parentId: story.id,
          title: `${formatOwnerRole(ownerRole)} follow-up for ${scopeItem}`,
          description:
            mode === 'existing-iteration'
              ? createIterationTaskDescription(scopeItem, ownerRole)
              : createTaskDescription(scopeItem, ownerRole),
          priority: ownerRole === 'backend' ? 'medium' : storyPriority,
          ownerRole
        })
      );
    }
  }

  const deliveryEpic = itemFactory.createEpic({
    title: 'Prepare the backlog for downstream delivery',
    description: 'Make the backlog easy to review, refine, and eventually automate.',
    priority: 'medium',
    ownerRole: 'po_pm'
  });
  items.push(deliveryEpic);

  const deliveryStory = itemFactory.createStory({
    parentId: deliveryEpic.id,
    title: 'Add review checkpoints before implementation',
    description: 'As the team, we want clear review checkpoints so the backlog can move from draft to ready in a controlled way.',
    priority: 'medium',
    ownerRole: 'po_pm',
    acceptanceCriteria: [
      'Manual review is required before implementation starts.',
      'Each specialist role knows where to add follow-up detail.',
      'The backlog draft can later be synchronized to other tools without losing structure.'
    ]
  });
  items.push(deliveryStory);

  items.push(
    itemFactory.createTask({
      parentId: deliveryStory.id,
      title: 'Document approval notes for the first backlog review',
      description: 'Capture which items are accepted, edited, or deferred after PO/PM review.',
      priority: 'medium',
      ownerRole: 'po_pm'
    })
  );

  items.push(
    itemFactory.createTask({
      parentId: deliveryStory.id,
      title: 'Check task sequencing and technical dependencies',
      description: 'Add a lightweight technical review before any implementation prompt is created.',
      priority: 'medium',
      ownerRole: 'tech_lead'
    })
  );

  if (brief.constraints.length > 0) {
    items.push(
      itemFactory.createRisk({
        title: 'Constraint alignment risk',
        description: `The backlog should be reviewed against these stated constraints: ${brief.constraints.join('; ')}.`,
        priority: 'medium',
        notes: brief.constraints
      })
    );
  }

  return {
    projectName: brief.title,
    projectSummary: summary,
    generatedAt: new Date().toISOString(),
    sourceBrief,
    assumptions,
    questions,
    items
  };
}
