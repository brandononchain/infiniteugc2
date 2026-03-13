/* ═══════════════════════════════════════════════════════════════════════════════
   AGENT SYSTEM — PUBLIC API
   ═══════════════════════════════════════════════════════════════════════════════

   Master orchestrators for image and video generation with specialist sub-agents.

   Architecture:
   ┌───────────────────────────────────────────────────────────────┐
   │                    AGENT SYSTEM                               │
   │                                                               │
   │  ┌─────────────────────┐    ┌─────────────────────┐          │
   │  │ IMAGE MASTER AGENT  │    │ VIDEO MASTER AGENT   │          │
   │  │ ┌─────┐ ┌─────┐    │    │ ┌─────┐ ┌─────┐    │          │
   │  │ │Prod │ │Life │... │    │ │UGC  │ │Cine │... │          │
   │  │ └─────┘ └─────┘    │    │ └─────┘ └─────┘    │          │
   │  │ (8 sub-agents)      │    │ (6 sub-agents)      │          │
   │  └─────────────────────┘    └─────────────────────┘          │
   └───────────────────────────────────────────────────────────────┘

   Usage:
     import { generateImagePrompt, generateVideoPayload } from "@/lib/agents";

   ═══════════════════════════════════════════════════════════════════════════════ */

// ── Types ────────────────────────────────────────────────────────────────────
export type {
  // Image types
  ImageAgentCategory,
  ImageStyle,
  ImageSubAgent,
  ImageAgentTemplate,
  ImageClassification,
  ImageGenerationPayload,
  // Internal prompting types
  InternalPromptStep,
  InternalPromptConfig,
  ProductContext,
  // Storyboard types
  StoryboardKeyframe,
  StoryboardPayload,
  // Video types
  VideoAgentCategory,
  VideoPlatform,
  VideoTone,
  VideoDuration,
  VideoProvider,
  VideoSubAgent,
  VideoAgentTemplate,
  VideoScriptSection,
  VideoClassification,
  VideoGenerationPayload,
} from "./types";

// ── Image Agent System ───────────────────────────────────────────────────────
export {
  classifyImageIntent,
  generateImagePrompt,
  generateStoryboard,
  getImageAgents,
  getImageAgent,
  getAllImageTemplates,
  getImageTemplates,
  IMAGE_SUB_AGENTS,
} from "./image-agents";

// ── Video Agent System ───────────────────────────────────────────────────────
export {
  classifyVideoIntent,
  generateVideoPayload,
  getVideoAgents,
  getVideoAgent,
  getAllVideoTemplates,
  getVideoTemplates,
  getRecommendedProvider,
  getPlatformDefaults,
  getDurationGuidelines,
  VIDEO_SUB_AGENTS,
} from "./video-agents";

// ── Runtime Markdown Loader ──────────────────────────────────────────────────
export { useImageAgents, useVideoAgents } from "./use-agents";

// ── Markdown Parser (server-side only) ───────────────────────────────────────
export type {
  ParsedAgent,
  ParsedSkills,
  ParsedSkill,
  ParsedRules,
  ParsedTemplate,
  ParsedScriptSection,
  ParsedKnowledge,
  ParsedTable,
  ParsedAgentBundle,
} from "./markdown-parser";
