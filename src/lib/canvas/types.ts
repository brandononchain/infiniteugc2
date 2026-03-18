/* ═══════════════════════════════════════════════════════════
   Canvas + CoPilot — Type Definitions
   ═══════════════════════════════════════════════════════════ */

import type { Avatar, Voice, Script, VideoProvider, TextOverlay } from "@/types";

/* ─── Node Types ─── */
export type WorkflowNodeType =
  | "product"
  | "avatar"
  | "script"
  | "voice"
  | "provider"
  | "captions"
  | "output";

export type NodeStatus = "empty" | "configured" | "processing" | "complete" | "error";

/* ─── Node Data Payloads ─── */
export interface ProductNodeData {
  name: string;
  description: string;
  url?: string;
  imageUrl?: string;
}

export interface AvatarNodeData {
  avatarId?: string;
  avatar?: Avatar;
}

export interface ScriptNodeData {
  scriptId?: string;
  script?: Script;
  content?: string;
  generatedContent?: string;
}

export interface VoiceNodeData {
  voiceId?: string;
  voice?: Voice;
}

export interface ProviderNodeData {
  provider: VideoProvider;
}

export interface CaptionsNodeData {
  enabled: boolean;
  style?: Record<string, unknown>;
  position?: { x: number; y: number };
}

export interface OutputNodeData {
  overlays?: TextOverlay[];
  campaignName?: string;
  estimatedCredits?: number;
}

export type NodeData =
  | ProductNodeData
  | AvatarNodeData
  | ScriptNodeData
  | VoiceNodeData
  | ProviderNodeData
  | CaptionsNodeData
  | OutputNodeData;

/* ─── Workflow Node ─── */
export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  position: { x: number; y: number };
  data: NodeData;
  status: NodeStatus;
}

/* ─── Connection ─── */
export interface Connection {
  id: string;
  from: string;
  to: string;
}

/* ─── Canvas State ─── */
export interface CanvasState {
  nodes: WorkflowNode[];
  connections: Connection[];
  selectedNodeId: string | null;
  zoom: number;
  pan: { x: number; y: number };
}

/* ─── CoPilot ─── */
export interface CoPilotMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  actions?: CoPilotAction[];
  timestamp: number;
}

export interface CoPilotAction {
  type:
    | "add_node"
    | "configure_node"
    | "connect_nodes"
    | "remove_node"
    | "clear_canvas"
    | "generate"
    | "generate_script";
  payload: Record<string, unknown>;
  label: string;
}

/* ─── Node Metadata (display) ─── */
export interface NodeMeta {
  type: WorkflowNodeType;
  label: string;
  description: string;
  icon: string;
  color: string;
  glowColor: string;
}

export const NODE_METADATA: Record<WorkflowNodeType, NodeMeta> = {
  product: {
    type: "product",
    label: "Product",
    description: "Define your product or brand",
    icon: "Package",
    color: "#f59e0b",
    glowColor: "rgba(245, 158, 11, 0.3)",
  },
  avatar: {
    type: "avatar",
    label: "Avatar",
    description: "Choose your AI presenter",
    icon: "UserCircle",
    color: "#8b5cf6",
    glowColor: "rgba(139, 92, 246, 0.3)",
  },
  script: {
    type: "script",
    label: "Script",
    description: "Write or generate your script",
    icon: "FileText",
    color: "#10b981",
    glowColor: "rgba(16, 185, 129, 0.3)",
  },
  voice: {
    type: "voice",
    label: "Voice",
    description: "Select voice for narration",
    icon: "Mic",
    color: "#ec4899",
    glowColor: "rgba(236, 72, 153, 0.3)",
  },
  provider: {
    type: "provider",
    label: "Provider",
    description: "Choose video generation engine",
    icon: "Cpu",
    color: "#00BCFF",
    glowColor: "rgba(0, 188, 255, 0.3)",
  },
  captions: {
    type: "captions",
    label: "Captions",
    description: "Auto-captions & styling",
    icon: "Subtitles",
    color: "#06b6d4",
    glowColor: "rgba(6, 182, 212, 0.3)",
  },
  output: {
    type: "output",
    label: "Output",
    description: "Final video & generate",
    icon: "Play",
    color: "#22c55e",
    glowColor: "rgba(34, 197, 94, 0.3)",
  },
};

/* ─── Default workflow layout positions ─── */
export const DEFAULT_NODE_POSITIONS: Record<WorkflowNodeType, { x: number; y: number }> = {
  product:  { x: 80,  y: 60 },
  avatar:   { x: 80,  y: 220 },
  script:   { x: 340, y: 60 },
  voice:    { x: 340, y: 220 },
  provider: { x: 600, y: 140 },
  captions: { x: 860, y: 60 },
  output:   { x: 860, y: 220 },
};

/* ─── Default connections for a standard UGC workflow ─── */
export const DEFAULT_CONNECTIONS: Array<{ from: WorkflowNodeType; to: WorkflowNodeType }> = [
  { from: "product", to: "script" },
  { from: "avatar", to: "provider" },
  { from: "script", to: "provider" },
  { from: "voice", to: "provider" },
  { from: "provider", to: "captions" },
  { from: "provider", to: "output" },
  { from: "captions", to: "output" },
];

/* ─── Video Provider display info ─── */
export const VIDEO_PROVIDERS: Record<VideoProvider, { label: string; tier: string; credits: number }> = {
  heygen:       { label: "HeyGen",        tier: "Standard", credits: 1 },
  omnihuman:    { label: "OmniHuman",     tier: "Premium",  credits: 3 },
  sora2:        { label: "Sora 2",        tier: "Standard", credits: 2 },
  sora2pro:     { label: "Sora 2 Pro",    tier: "Premium",  credits: 5 },
  seedance:     { label: "Seedance",      tier: "Standard", credits: 1 },
  hedra_avatar: { label: "Hedra Avatar",  tier: "Standard", credits: 1 },
  hedra_omnia:  { label: "Hedra Omnia",   tier: "Standard", credits: 2 },
  veo3:         { label: "VEO 3",         tier: "Premium",  credits: 4 },
};
