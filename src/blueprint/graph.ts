import type { DeliveryGraphNode, DeliveryGraphValidation } from './blueprint.types.ts';

export function validateDeliveryGraph(nodes: DeliveryGraphNode[]): DeliveryGraphValidation {
  const ids = new Set<string>();
  const errors: string[] = [];

  for (const node of nodes) {
    if (ids.has(node.id)) {
      errors.push(`Duplicate graph node id: ${node.id}.`);
    }
    ids.add(node.id);
  }

  for (const node of nodes) {
    for (const dependency of node.dependsOn) {
      if (!ids.has(dependency)) {
        errors.push(`Node "${node.id}" depends on unknown node "${dependency}".`);
      }
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();

  function visit(nodeId: string, trail: string[]): void {
    if (visited.has(nodeId)) return;
    if (visiting.has(nodeId)) {
      errors.push(`Cycle detected: ${[...trail, nodeId].join(' -> ')}.`);
      return;
    }

    visiting.add(nodeId);
    const node = nodes.find((candidate) => candidate.id === nodeId);
    for (const dependency of node?.dependsOn ?? []) {
      visit(dependency, [...trail, nodeId]);
    }
    visiting.delete(nodeId);
    visited.add(nodeId);
  }

  for (const node of nodes) {
    visit(node.id, []);
  }

  return { valid: errors.length === 0, errors };
}

export function resolveDeliveryOrder(nodes: DeliveryGraphNode[]): string[] {
  const remaining = new Map(nodes.map((node) => [node.id, node]));
  const completed = new Set<string>();
  const order: string[] = [];

  while (remaining.size > 0) {
    const ready = [...remaining.values()]
      .filter((node) => node.dependsOn.every((dependency) => completed.has(dependency)))
      .sort((left, right) => left.id.localeCompare(right.id));

    if (ready.length === 0) {
      return order;
    }

    for (const node of ready) {
      order.push(node.id);
      completed.add(node.id);
      remaining.delete(node.id);
    }
  }

  return order;
}

export function getReadyGraphNodeIds(nodes: DeliveryGraphNode[], completedNodeIds: string[]): string[] {
  const completed = new Set(completedNodeIds);

  return nodes
    .filter((node) => !completed.has(node.id))
    .filter((node) => node.dependsOn.every((dependency) => completed.has(dependency)))
    .map((node) => node.id)
    .sort();
}

