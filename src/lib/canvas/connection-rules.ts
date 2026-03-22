import type { WorkflowNodeType, WorkflowNode, Connection } from "./types";

/* ═══════════════════════════════════════════════════════════
   Connection Validation Rules

   Defines the valid directed edges in the workflow graph.
   Each key maps to the set of node types it can connect TO.

   Core pipeline:
   product    → script, clone
   avatar     → provider, motion_control
   script     → provider, premium_video, mass_batch
   voice      → provider, motion_control, lipsync, dubbing
   provider   → captions, output
   captions   → output
   voice_clone → voice

   Creative:
   storyboard    → script
   image_gen     → broll, motion_control, provider

   Post-production (output feeds into):
   output        → hooks, dubbing, lipsync, clone

   Standalone production nodes:
   premium_video → hooks, dubbing, clone
   mass_batch    → hooks, dubbing, clone
   motion_control → output, hooks, dubbing
   broll          → output

   Rules:
   - No self-connections
   - No duplicate connections
   - Terminal nodes have no outgoing edges
   ═══════════════════════════════════════════════════════════ */

const ALLOWED_CONNECTIONS: Record<WorkflowNodeType, WorkflowNodeType[]> = {
  // Core pipeline
  product:         ["script", "clone"],
  avatar:          ["provider", "motion_control"],
  script:          ["provider", "premium_video", "mass_batch"],
  voice:           ["provider", "motion_control", "lipsync", "dubbing"],
  provider:        ["captions", "output"],
  captions:        ["output"],
  output:          ["hooks", "dubbing", "lipsync", "clone"],

  // Creative / Input
  storyboard:      ["script"],
  image_gen:       ["broll", "motion_control", "provider"],
  voice_clone:     ["voice"],

  // Production
  premium_video:   ["hooks", "dubbing", "clone"],
  mass_batch:      ["hooks", "dubbing", "clone"],
  motion_control:  ["output", "hooks", "dubbing"],
  broll:           ["output"],

  // Post-production (terminal or chain)
  hooks:           [],
  dubbing:         [],
  lipsync:         [],
  clone:           ["hooks", "dubbing"],
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
