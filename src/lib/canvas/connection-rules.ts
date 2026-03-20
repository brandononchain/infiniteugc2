import type { WorkflowNodeType, WorkflowNode, Connection } from "./types";

/* ═══════════════════════════════════════════════════════════
   Connection Validation Rules

   Defines the valid directed edges in the workflow graph.
   Each key maps to the set of node types it can connect TO.

   Valid flow:
   product  → script
   avatar   → provider
   script   → provider
   voice    → provider
   provider → captions, output
   captions → output

   Rules:
   - No self-connections
   - No duplicate connections
   - No cycles (output has no outgoing edges)
   - Max 1 connection from any source to any target
   ═══════════════════════════════════════════════════════════ */

const ALLOWED_CONNECTIONS: Record<WorkflowNodeType, WorkflowNodeType[]> = {
  product:  ["script"],
  avatar:   ["provider"],
  script:   ["provider"],
  voice:    ["provider"],
  provider: ["captions", "output"],
  captions: ["output"],
  output:   [], // terminal node — no outgoing connections
};

export interface ConnectionValidationResult {
  valid: boolean;
  reason?: string;
}

export function validateConnection(
  fromNode: WorkflowNode,
  toNode: WorkflowNode,
  existingConnections: Connection[]
): ConnectionValidationResult {
  // No self-connections
  if (fromNode.id === toNode.id) {
    return { valid: false, reason: "Cannot connect a node to itself" };
  }

  // Check if this edge type is allowed
  const allowed = ALLOWED_CONNECTIONS[fromNode.type];
  if (!allowed || !allowed.includes(toNode.type)) {
    return {
      valid: false,
      reason: `Cannot connect ${fromNode.type} to ${toNode.type}`,
    };
  }

  // No duplicate connections
  const isDuplicate = existingConnections.some(
    (c) => c.from === fromNode.id && c.to === toNode.id
  );
  if (isDuplicate) {
    return { valid: false, reason: "Connection already exists" };
  }

  return { valid: true };
}

/**
 * Returns the list of node types that a given node type can connect to.
 * Useful for UI hints (highlighting valid drop targets).
 */
export function getValidTargets(fromType: WorkflowNodeType): WorkflowNodeType[] {
  return ALLOWED_CONNECTIONS[fromType] || [];
}

/**
 * Returns the list of node types that can connect to a given node type.
 * Useful for UI hints (highlighting valid source nodes).
 */
export function getValidSources(toType: WorkflowNodeType): WorkflowNodeType[] {
  return (Object.entries(ALLOWED_CONNECTIONS) as [WorkflowNodeType, WorkflowNodeType[]][])
    .filter(([, targets]) => targets.includes(toType))
    .map(([source]) => source);
}
