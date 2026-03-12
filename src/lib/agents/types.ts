/* ═══════════════════════════════════════════════════════════════════════════════
   AGENT SYSTEM — TYPE DEFINITIONS
   ═══════════════════════════════════════════════════════════════════════════════ */

// ── Image Generation Agent Types ─────────────────────────────────────────────

export type ImageAgentCategory =
  | "product-ugc"
  | "lifestyle"
  | "food-beverage"
  | "fashion-beauty"
  | "tech-gadgets"
  | "abstract-artistic"
  | "social-media"
  | "brand-marketing"
  | "storyboard";

export type ImageStyle =
  | "photorealistic"
  | "cinematic"
  | "editorial"
  | "minimal"
  | "vibrant"
  | "moody"
  | "soft_dreamy"
  | "raw_authentic";

export interface ImageAgentTemplate {
  id: string;
  name: string;
  description: string;
  tags: string[];
  prompt: string;
}

export interface ImageSubAgent {
  id: ImageAgentCategory;
  name: string;
  description: string;
  voice: string;
  defaultCamera: {
    lens: string;
    lighting: string;
    filmStock: string;
    post: string;
  };
  rules: {
    must: string[];
    mustNot: string[];
    defaults: Record<string, string>;
  };
  skills: string[];
  templates: ImageAgentTemplate[];
}

export interface ImageClassification {
  category: ImageAgentCategory;
  confidence: number;
  mood: string;
  complexity: "simple" | "standard" | "complex";
  entities: string[];
  secondaryCategory?: ImageAgentCategory;
}

export interface ImageGenerationPayload {
  prompt: string;
  negativePrompt: string;
  style: ImageStyle;
  agentUsed: ImageAgentCategory;
  templateUsed?: string;
  confidence: number;
  needsClarification: boolean;
}

// ── Storyboard Types ─────────────────────────────────────────────────────────

export interface StoryboardKeyframe {
  index: number;
  beatLabel: string;
  prompt: string;
  negativePrompt: string;
  focalLength: string;
  mood: string;
}

export interface StoryboardPayload {
  keyframes: StoryboardKeyframe[];
  model: "nano_banana";
  aspectRatio: "16:9";
  agentUsed: "storyboard";
  templateUsed?: string;
  palette: string;
  totalFrames: number;
  consistency: {
    environment: string;
    character: string;
    palette: string;
    filmStock: string;
  };
}

// ── Video Generation Agent Types ─────────────────────────────────────────────

export type VideoAgentCategory =
  | "ugc-ad"
  | "cinematic-hero"
  | "tutorial-howto"
  | "testimonial"
  | "trend-hijack"
  | "story-driven";

export type VideoPlatform =
  | "tiktok"
  | "instagram_reels"
  | "youtube_shorts"
  | "youtube"
  | "instagram_feed"
  | "twitter";

export type VideoTone =
  | "energetic"
  | "professional"
  | "conversational"
  | "dramatic"
  | "humorous"
  | "urgent"
  | "empathetic"
  | "inspirational";

export type VideoDuration = "short" | "medium" | "long";

export type VideoProvider =
  | "heygen"
  | "omnihuman"
  | "sora2"
  | "sora2pro"
  | "seedance"
  | "hedra_avatar"
  | "hedra_omnia"
  | "veo3";

export interface VideoScriptSection {
  label: string;
  duration: string;
  content: string;
  textOverlay?: string;
}

export interface VideoAgentTemplate {
  id: string;
  name: string;
  description: string;
  tags: string[];
  duration: string;
  structure: string;
  sections: VideoScriptSection[];
}

export interface VideoSubAgent {
  id: VideoAgentCategory;
  name: string;
  description: string;
  voice: string;
  defaultParams: {
    duration: string;
    provider: VideoProvider;
    aspectRatio: string;
    pacing: string;
    captionStyle: string;
  };
  rules: {
    must: string[];
    mustNot: string[];
    defaults: Record<string, string>;
  };
  skills: string[];
  templates: VideoAgentTemplate[];
}

export interface VideoClassification {
  category: VideoAgentCategory;
  confidence: number;
  platform: VideoPlatform;
  tone: VideoTone;
  duration: VideoDuration;
  entities: string[];
}

export interface VideoGenerationPayload {
  script: string;
  sections: VideoScriptSection[];
  provider: VideoProvider;
  agentUsed: VideoAgentCategory;
  templateUsed?: string;
  platform: VideoPlatform;
  tone: VideoTone;
  duration: VideoDuration;
  aspectRatio: string;
  captionStyle: string;
  confidence: number;
  needsClarification: boolean;
}
