/* ═══════════════════════════════════════════════════════════
   Canvas + CoPilot — Type Definitions
   ═══════════════════════════════════════════════════════════ */

import type { Avatar, Voice, Script, VideoProvider, PremiumVideoProvider, MassVideoProvider, TextOverlay } from "@/types";

/* ─── Node Types ─── */
export type WorkflowNodeType =
  // Core pipeline
  | "product"
  | "avatar"
  | "script"
  | "voice"
  | "provider"
  | "captions"
  | "output"
  // Creative / Input
  | "image_gen"
  | "voice_clone"
  | "storyboard"
  // Production
  | "premium_video"
  | "mass_batch"
  | "motion_control"
  | "broll"
  // Post-production
  | "hooks"
  | "dubbing"
  | "lipsync"
  | "clone";

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

export interface ImageGenNodeData {
  prompt?: string;
  model?: "nano_banana_pro" | "nano_banana_2" | "seedream_4_5";
  aspectRatio?: string;
  count?: number;
  referenceImageUrls?: string[];
  generatedImageUrl?: string;
}

export interface VoiceCloneNodeData {
  name?: string;
  sourceType?: "upload" | "from_video";
  audioFileUrl?: string;
  clonedVoiceId?: string;
}

export interface StoryboardNodeData {
  scenes?: Array<{
    index: number;
    description: string;
    duration?: string;
    camera?: string;
    notes?: string;
  }>;
  totalScenes?: number;
}

export interface PremiumVideoNodeData {
  scriptContent?: string;
  keyframeImageUrl?: string;
  instructions?: string;
  videoProvider?: PremiumVideoProvider;
  voiceId?: string;
  estimatedChunks?: number;
  estimatedCredits?: number;
}

export interface MassBatchNodeData {
  campaignName?: string;
  scriptGroupId?: string;
  scriptGroupName?: string;
  scriptCount?: number;
  videoProvider?: MassVideoProvider;
  captionEnabled?: boolean;
}

export interface MotionControlNodeData {
  name?: string;
  imageUrl?: string;
  videoUrl?: string;
  presetMotion?: string;
  script?: string;
  voiceSource?: "clone_from_video" | "existing";
  voiceId?: string;
  lipsyncModel?: "lipsync-2" | "lipsync-2-pro";
}

export interface BRollNodeData {
  name?: string;
  prompt?: string;
  imageUrl?: string;
  model?: "kling-2.6" | "kling-3.0" | "seeddance-1.0-fast" | "seeddance-1.5-pro";
  duration?: number;
  aspectRatio?: string;
}

export interface HooksNodeData {
  sourceType?: "job" | "premium_job" | "mass_job";
  sourceId?: string;
  sourceVideoUrl?: string;
}

export interface DubbingNodeData {
  sourceType?: "job" | "premium_job" | "mass_job" | "upload";
  sourceId?: string;
  videoUrl?: string;
  languages?: Array<{ code: string; label: string }>;
  mode?: "fast" | "quality";
  captionEnabled?: boolean;
}

export interface LipsyncNodeData {
  sourceVideoUrl?: string;
  script?: string;
  voiceId?: string;
  model?: "lipsync-2" | "lipsync-2-pro" | "react-1";
}

export interface CloneNodeData {
  sourceType?: "job" | "premium_job" | "mass_job";
  sourceId?: string;
  sourceVideoUrl?: string;
  userPrompt?: string;
  mode?: "standard" | "advanced";
  productName?: string;
  productDescription?: string;
  productImageUrl?: string;
  preferredModel?: "sora2pro" | "veo3";
}

export type NodeData =
  | ProductNodeData
  | AvatarNodeData
  | ScriptNodeData
  | VoiceNodeData
  | ProviderNodeData
  | CaptionsNodeData
  | OutputNodeData
  | ImageGenNodeData
  | VoiceCloneNodeData
  | StoryboardNodeData
  | PremiumVideoNodeData
  | MassBatchNodeData
  | MotionControlNodeData
  | BRollNodeData
  | HooksNodeData
  | DubbingNodeData
  | LipsyncNodeData
  | CloneNodeData;

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
  // Core pipeline
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

  // Creative / Input
  image_gen: {
    type: "image_gen",
    label: "Image Gen",
    description: "Generate AI images from prompts",
    icon: "ImagePlus",
    color: "#f472b6",
    glowColor: "rgba(244, 114, 182, 0.3)",
  },
  voice_clone: {
    type: "voice_clone",
    label: "Voice Clone",
    description: "Clone a voice from audio",
    icon: "AudioLines",
    color: "#a78bfa",
    glowColor: "rgba(167, 139, 250, 0.3)",
  },
  storyboard: {
    type: "storyboard",
    label: "Storyboard",
    description: "Plan multi-scene video flow",
    icon: "LayoutPanelTop",
    color: "#fbbf24",
    glowColor: "rgba(251, 191, 36, 0.3)",
  },

  // Production
  premium_video: {
    type: "premium_video",
    label: "Premium Video",
    description: "Long-form multi-chunk video",
    icon: "Crown",
    color: "#c084fc",
    glowColor: "rgba(192, 132, 252, 0.3)",
  },
  mass_batch: {
    type: "mass_batch",
    label: "Mass Batch",
    description: "Batch generate from script group",
    icon: "Layers",
    color: "#fb923c",
    glowColor: "rgba(251, 146, 60, 0.3)",
  },
  motion_control: {
    type: "motion_control",
    label: "Motion Control",
    description: "Animate image with face swap",
    icon: "Move3d",
    color: "#14b8a6",
    glowColor: "rgba(20, 184, 166, 0.3)",
  },
  broll: {
    type: "broll",
    label: "B-Roll",
    description: "Generate B-Roll from image",
    icon: "Film",
    color: "#38bdf8",
    glowColor: "rgba(56, 189, 248, 0.3)",
  },

  // Post-production
  hooks: {
    type: "hooks",
    label: "Hooks",
    description: "Generate viral hooks from video",
    icon: "Zap",
    color: "#facc15",
    glowColor: "rgba(250, 204, 21, 0.3)",
  },
  dubbing: {
    type: "dubbing",
    label: "Dubbing",
    description: "Dub video into multiple languages",
    icon: "Globe",
    color: "#4ade80",
    glowColor: "rgba(74, 222, 128, 0.3)",
  },
  lipsync: {
    type: "lipsync",
    label: "Lip Sync",
    description: "Re-sync lips to new audio",
    icon: "Speech",
    color: "#f87171",
    glowColor: "rgba(248, 113, 113, 0.3)",
  },
  clone: {
    type: "clone",
    label: "Clone / Katorip",
    description: "Recreate a video with new product",
    icon: "Copy",
    color: "#e879f9",
    glowColor: "rgba(232, 121, 249, 0.3)",
  },
};

/* ─── Default workflow layout positions ─── */
export const DEFAULT_NODE_POSITIONS: Record<WorkflowNodeType, { x: number; y: number }> = {
  // Core pipeline (row 1-2)
  product:         { x: 80,   y: 60 },
  avatar:          { x: 80,   y: 220 },
  script:          { x: 340,  y: 60 },
  voice:           { x: 340,  y: 220 },
  provider:        { x: 600,  y: 140 },
  captions:        { x: 860,  y: 60 },
  output:          { x: 860,  y: 220 },
  // Creative / Input (row 3)
  storyboard:      { x: 80,   y: 420 },
  image_gen:       { x: 340,  y: 420 },
  voice_clone:     { x: 600,  y: 420 },
  // Production (row 4)
  premium_video:   { x: 80,   y: 580 },
  mass_batch:      { x: 340,  y: 580 },
  motion_control:  { x: 600,  y: 580 },
  broll:           { x: 860,  y: 580 },
  // Post-production (row 5)
  hooks:           { x: 80,   y: 740 },
  dubbing:         { x: 340,  y: 740 },
  lipsync:         { x: 600,  y: 740 },
  clone:           { x: 860,  y: 740 },
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

/* ─── B-Roll model display info ─── */
export const BROLL_MODELS: Record<string, { label: string; credits: number }> = {
  "kling-2.6":            { label: "Kling 2.6",          credits: 2 },
  "kling-3.0":            { label: "Kling 3.0",          credits: 3 },
  "seeddance-1.0-fast":   { label: "SeedDance Fast",     credits: 1 },
  "seeddance-1.5-pro":    { label: "SeedDance Pro",      credits: 3 },
};

/* ─── Motion control preset motions ─── */
export const MOTION_PRESETS = [
  "Cute Baby Dance",
  "Nezha",
  "Walk Forward",
  "Dance Groove",
  "Head Nod",
  "Hand Wave",
  "Turn Around",
  "Jump",
  "Sit Down",
] as const;

/* ─── Dubbing languages ─── */
export const DUBBING_LANGUAGES = [
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "pt", label: "Portuguese" },
  { code: "it", label: "Italian" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "zh", label: "Chinese" },
  { code: "hi", label: "Hindi" },
  { code: "ar", label: "Arabic" },
  { code: "ru", label: "Russian" },
  { code: "tr", label: "Turkish" },
] as const;
