import type { ParsedBrief } from '../briefs/brief.types.ts';
import {
  DELIVERY_PLAN_SCHEMA_VERSION,
  type DeliveryBacklogTrace,
  type DeliveryBlueprint,
  type DeliveryDecision,
  type DeliveryGraphNode,
  type DeliveryPlan,
  type HumanPlanDecision
} from './blueprint.types.ts';
import { resolveDeliveryOrder, validateDeliveryGraph } from './graph.ts';

export const DELIVERY_BLUEPRINTS: DeliveryBlueprint[] = [
  {
    id: 'nextjs-vercel-marketing-site',
    name: 'Next.js Vercel marketing site',
    projectKind: 'marketing-site',
    description: 'Public marketing or showcase site with content, forms, SEO, accessibility and deployment gates.',
    profiles: ['po-pm', 'ux-ui', 'frontend', 'seo', 'accessibility', 'performance-frontend', 'qa', 'devops'],
    defaultGates: ['identity-and-content', 'accessibility-and-seo', 'production'],
    defaultArtifacts: ['normalized-brief', 'content-map', 'page-backlog', 'qa-checklist', 'deployment-notes']
  },
  {
    id: 'web-saas-node-or-java',
    name: 'Web SaaS application',
    projectKind: 'web-saas',
    description: 'Authenticated product with data model, backend services, frontend flows, security and cost gates.',
    profiles: ['po-pm', 'tech-lead', 'frontend', 'backend', 'security', 'accessibility', 'finance-cost', 'qa', 'devops'],
    defaultGates: ['architecture', 'data-model', 'budget', 'production'],
    defaultArtifacts: ['normalized-brief', 'architecture-notes', 'data-model', 'delivery-backlog', 'security-checklist']
  }
];

function textFor(brief: ParsedBrief): string {
  return [
    brief.title,
    brief.summary,
    ...brief.goals,
    ...brief.pages,
    ...brief.constraints,
    ...brief.successCriteria,
    ...(brief.notes ?? [])
  ].join(' ').toLowerCase();
}

function scoreBlueprint(brief: ParsedBrief, blueprint: DeliveryBlueprint): number {
  const text = textFor(brief);
  const marketingTerms = ['site', 'vitrine', 'landing', 'marketing', 'seo', 'page', 'contact', 'cabinet', 'showcase'];
  const saasTerms = ['saas', 'reservation', 'booking', 'auth', 'dashboard', 'api', 'database', 'notification', 'tenant'];
  const terms = blueprint.projectKind === 'marketing-site' ? marketingTerms : saasTerms;
  let score = 0;

  for (const term of terms) {
    if (text.includes(term)) score += 2;
  }

  if (blueprint.projectKind === 'marketing-site' && brief.pages.length > 0) score += 1;
  if (blueprint.projectKind === 'web-saas' && brief.constraints.some((constraint) => /api|data|auth|database/i.test(constraint))) {
    score += 2;
  }

  return score;
}

function selectBlueprint(brief: ParsedBrief): { selected: DeliveryBlueprint; alternatives: DeliveryBlueprint[] } {
  const ranked = [...DELIVERY_BLUEPRINTS].sort(
    (left, right) => scoreBlueprint(brief, right) - scoreBlueprint(brief, left) || left.id.localeCompare(right.id)
  );
  return { selected: ranked[0], alternatives: ranked.slice(1) };
}

function hasSelected(decisions: HumanPlanDecision[], decisionId: string): string | undefined {
  return decisions.find((decision) => decision.decisionId === decisionId)?.selectedOption;
}

function buildDecisions(brief: ParsedBrief, blueprint: DeliveryBlueprint, decisions: HumanPlanDecision[]): DeliveryDecision[] {
  const result: DeliveryDecision[] = [];
  const contentOption = hasSelected(decisions, 'content-owner');
  const architectureOption = hasSelected(decisions, 'architecture-stack');

  if (blueprint.projectKind === 'marketing-site') {
    result.push({
      id: 'content-owner',
      question: 'Who validates content, brand voice and final publication scope?',
      options: ['project-owner', 'marketing-owner', 'agency-review'],
      recommendation: 'project-owner',
      status: contentOption ? 'accepted' : 'pending',
      selectedOption: contentOption
    });
  } else {
    result.push({
      id: 'architecture-stack',
      question: 'Which backend stack should anchor the first implementation plan?',
      options: ['node-typescript', 'java-spring', 'defer-to-tech-lead'],
      recommendation: 'node-typescript',
      status: architectureOption ? 'accepted' : 'pending',
      selectedOption: architectureOption
    });
  }

  if (brief.successCriteria.length === 0) {
    result.push({
      id: 'success-metrics',
      question: 'Which measurable success criteria should gate the first delivery?',
      options: ['conversion-or-activation', 'quality-and-regression', 'manual-approval-only'],
      recommendation: 'quality-and-regression',
      status: 'pending'
    });
  }

  return result;
}

function commonDiscoveryNode(brief: ParsedBrief): DeliveryGraphNode {
  return {
    id: 'discover-scope',
    title: 'Normalize brief and blocking questions',
    kind: 'discovery',
    role: 'po-pm',
    dependsOn: [],
    inputs: ['source brief'],
    outputs: ['normalized brief', 'blocking questions', 'assumptions'],
    artifacts: ['normalized-brief.md'],
    permissions: ['read-project-docs'],
    gate: brief.audience.length === 0 || brief.successCriteria.length === 0
      ? { id: 'scope-approval', title: 'Human validates missing audience or success criteria', required: true }
      : undefined
  };
}

function marketingGraph(brief: ParsedBrief): DeliveryGraphNode[] {
  const pages = brief.pages.length > 0 ? brief.pages : ['home', 'contact'];
  return [
    commonDiscoveryNode(brief),
    {
      id: 'blueprint-content-map',
      title: 'Map content and page structure',
      kind: 'architecture',
      role: 'ux-ui',
      dependsOn: ['discover-scope'],
      inputs: ['normalized brief', 'selected blueprint'],
      outputs: ['content map', 'page inventory'],
      artifacts: ['content-map.md', 'page-inventory.json'],
      permissions: ['read-project-docs'],
      gate: { id: 'content-approval', title: `Human validates scope for ${pages.join(', ')}`, required: true }
    },
    {
      id: 'build-pages',
      title: 'Prepare frontend page backlog',
      kind: 'implementation',
      role: 'frontend',
      dependsOn: ['blueprint-content-map'],
      inputs: ['content map'],
      outputs: ['frontend stories', 'component tasks'],
      artifacts: ['frontend-backlog.md'],
      permissions: ['read-project-docs', 'write-outputs']
    },
    {
      id: 'optimize-discovery',
      title: 'Plan SEO, accessibility and performance checks',
      kind: 'validation',
      role: 'seo',
      dependsOn: ['build-pages'],
      inputs: ['frontend backlog'],
      outputs: ['seo checks', 'accessibility checks', 'performance checks'],
      artifacts: ['quality-checklist.md'],
      permissions: ['read-project-docs']
    },
    {
      id: 'release-site',
      title: 'Prepare deployment and production gate',
      kind: 'release',
      role: 'devops',
      dependsOn: ['optimize-discovery'],
      inputs: ['quality checklist'],
      outputs: ['deployment notes', 'production gate'],
      artifacts: ['deployment-notes.md'],
      permissions: ['read-project-docs'],
      gate: { id: 'production-approval', title: 'Human approves production publication', required: true }
    }
  ];
}

function saasGraph(brief: ParsedBrief, decisions: HumanPlanDecision[]): DeliveryGraphNode[] {
  const stack = hasSelected(decisions, 'architecture-stack') ?? 'node-typescript';
  return [
    commonDiscoveryNode(brief),
    {
      id: 'architecture-spine',
      title: `Define architecture spine (${stack})`,
      kind: 'architecture',
      role: 'tech-lead',
      dependsOn: ['discover-scope'],
      inputs: ['normalized brief', 'constraints'],
      outputs: ['architecture decision', 'system boundaries'],
      artifacts: ['architecture-notes.md'],
      permissions: ['read-project-docs'],
      gate: { id: 'architecture-approval', title: 'Human validates architecture and stack', required: true }
    },
    {
      id: 'data-and-api-model',
      title: 'Model data, API and permission flows',
      kind: 'architecture',
      role: 'backend',
      dependsOn: ['architecture-spine'],
      inputs: ['architecture decision'],
      outputs: ['data model', 'API backlog', 'permission notes'],
      artifacts: ['data-model.md', 'api-backlog.md'],
      permissions: ['read-project-docs']
    },
    {
      id: 'product-flows',
      title: 'Prepare product and frontend flows',
      kind: 'implementation',
      role: 'frontend',
      dependsOn: ['data-and-api-model'],
      inputs: ['data model', 'API backlog'],
      outputs: ['frontend stories', 'flow backlog'],
      artifacts: ['frontend-flow-backlog.md'],
      permissions: ['read-project-docs', 'write-outputs']
    },
    {
      id: 'quality-and-security',
      title: 'Plan QA, security and cost gates',
      kind: 'validation',
      role: 'qa',
      dependsOn: ['product-flows'],
      inputs: ['flow backlog', 'permission notes'],
      outputs: ['qa checklist', 'security checklist', 'cost assumptions'],
      artifacts: ['qa-security-cost-checklist.md'],
      permissions: ['read-project-docs'],
      gate: { id: 'quality-approval', title: 'Human validates quality/security before build delegation', required: true }
    },
    {
      id: 'release-saas',
      title: 'Prepare staging and production path',
      kind: 'release',
      role: 'devops',
      dependsOn: ['quality-and-security'],
      inputs: ['qa checklist'],
      outputs: ['staging plan', 'production gate'],
      artifacts: ['release-plan.md'],
      permissions: ['read-project-docs'],
      gate: { id: 'production-approval', title: 'Human approves production readiness', required: true }
    }
  ];
}

function buildAssumptions(brief: ParsedBrief, blueprint: DeliveryBlueprint, decisions: DeliveryDecision[]): string[] {
  const assumptions = [
    `Selected blueprint "${blueprint.id}" is a recommendation that must remain editable by a human.`,
    'No provider call is required to compile this plan.',
    'Generated issue suggestions remain traceable to graph nodes before any GitHub write happens.'
  ];
  for (const decision of decisions.filter((entry) => entry.status === 'accepted')) {
    assumptions.push(`Human decision preserved: ${decision.id} = ${decision.selectedOption}.`);
  }
  if (brief.constraints.length > 0) {
    assumptions.push(`Plan must respect constraints: ${brief.constraints.join('; ')}.`);
  }
  return assumptions;
}

function buildRisks(brief: ParsedBrief, blueprint: DeliveryBlueprint): string[] {
  const risks: string[] = [];
  if (brief.audience.length === 0) risks.push('Audience is missing; discovery gate should stay required.');
  if (brief.successCriteria.length === 0) risks.push('Success criteria are missing; validation gates may be subjective.');
  if (blueprint.projectKind === 'web-saas' && !textFor(brief).includes('auth')) {
    risks.push('SaaS plan may need authentication decisions before implementation.');
  }
  return risks;
}

function traceBacklog(nodes: DeliveryGraphNode[]): DeliveryBacklogTrace[] {
  return nodes.map((node) => ({
    nodeId: node.id,
    suggestedIssueTitle: `[${node.role}] ${node.title}`,
    ownerRole: node.role,
    dependsOn: [...node.dependsOn]
  }));
}

function normalizedBrief(brief: ParsedBrief): DeliveryPlan['normalizedBrief'] {
  return {
    title: brief.title,
    summary: brief.summary,
    goals: [...brief.goals],
    audience: [...brief.audience],
    pages: [...brief.pages],
    constraints: [...brief.constraints],
    successCriteria: [...brief.successCriteria],
    mode: brief.mode
  };
}

export function compileDeliveryPlan(
  brief: ParsedBrief,
  sourceBrief: string,
  decisions: HumanPlanDecision[] = []
): DeliveryPlan {
  const { selected, alternatives } = selectBlueprint(brief);
  const graph = selected.projectKind === 'marketing-site' ? marketingGraph(brief) : saasGraph(brief, decisions);
  const planDecisions = buildDecisions(brief, selected, decisions);
  const validation = validateDeliveryGraph(graph);

  return {
    schemaVersion: DELIVERY_PLAN_SCHEMA_VERSION,
    projectName: brief.title,
    sourceBrief,
    normalizedBrief: normalizedBrief(brief),
    selectedBlueprint: selected,
    alternatives,
    assumptions: buildAssumptions(brief, selected, planDecisions),
    risks: buildRisks(brief, selected),
    decisions: planDecisions,
    graph,
    deliveryOrder: resolveDeliveryOrder(graph),
    backlogTrace: traceBacklog(graph),
    validation,
    validationPlan: [
      'Validate blocking decisions before executing dependent nodes.',
      'Run graph validation before deriving issues or agent tasks.',
      'Keep human changes as explicit decisions, then recompile deterministically.'
    ]
  };
}

