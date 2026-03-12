/* ═══════════════════════════════════════════════════════════════════════════════
   AGENT RUNTIME HOOKS
   ═══════════════════════════════════════════════════════════════════════════════
   React hooks that fetch parsed agent definitions from the API route
   (which reads Markdown files at runtime) and merge them with the
   hardcoded TypeScript agent system.

   This means:
   - Edit a .md file → agents update on next request (no rebuild needed)
   - Hardcoded TS agents serve as fallback if API is unavailable
   - Templates from .md files override hardcoded ones when present
   ═══════════════════════════════════════════════════════════════════════════════ */

"use client";

import { useState, useEffect, useCallback } from "react";
import type { ParsedAgentBundle } from "./markdown-parser";
import type {
  ImageSubAgent,
  ImageAgentTemplate,
  ImageAgentCategory,
  VideoSubAgent,
  VideoAgentTemplate,
  VideoAgentCategory,
  VideoScriptSection,
} from "./types";
import { IMAGE_SUB_AGENTS } from "./image-agents";
import { VIDEO_SUB_AGENTS } from "./video-agents";

// ── Types ────────────────────────────────────────────────────────────────────

interface AgentDomainResult {
  master: ParsedAgentBundle | null;
  subAgents: Record<string, ParsedAgentBundle>;
}

interface AgentsResponse {
  image?: AgentDomainResult;
  video?: AgentDomainResult;
}

interface UseAgentsResult<T> {
  agents: T[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  source: "runtime" | "hardcoded";
}

// ── Merge Parsed → Typed Agent ───────────────────────────────────────────────

function mergeImageAgent(
  id: ImageAgentCategory,
  hardcoded: ImageSubAgent,
  parsed: ParsedAgentBundle
): ImageSubAgent {
  const mergedTemplates: ImageAgentTemplate[] = parsed.templates.map((pt) => ({
    id: pt.id,
    name: pt.name,
    description: pt.description,
    tags: pt.tags,
    prompt: pt.prompt || "",
  }));

  return {
    ...hardcoded,
    id,
    name: parsed.agent.name || hardcoded.name,
    description: parsed.agent.role || hardcoded.description,
    voice: parsed.agent.voice || hardcoded.voice,
    rules: {
      must: parsed.rules.hardRules.length > 0 ? parsed.rules.hardRules : hardcoded.rules.must,
      mustNot: parsed.rules.softRules.length > 0 ? parsed.rules.softRules : hardcoded.rules.mustNot,
      defaults: Object.keys(parsed.rules.defaults).length > 0 ? parsed.rules.defaults : hardcoded.rules.defaults,
    },
    skills:
      parsed.skills.skills.length > 0
        ? parsed.skills.skills.map((s) => s.name)
        : hardcoded.skills,
    templates: mergedTemplates.length > 0 ? mergedTemplates : hardcoded.templates,
  };
}

function mergeVideoAgent(
  id: VideoAgentCategory,
  hardcoded: VideoSubAgent,
  parsed: ParsedAgentBundle
): VideoSubAgent {
  const mergedTemplates: VideoAgentTemplate[] = parsed.templates.map((pt) => ({
    id: pt.id,
    name: pt.name,
    description: pt.description,
    tags: pt.tags,
    duration: pt.duration || "30s",
    structure: pt.structure || "",
    sections: (pt.sections || []).map(
      (s): VideoScriptSection => ({
        label: s.label,
        duration: s.duration,
        content: s.content,
        textOverlay: s.textOverlay,
      })
    ),
  }));

  return {
    ...hardcoded,
    id,
    name: parsed.agent.name || hardcoded.name,
    description: parsed.agent.role || hardcoded.description,
    voice: parsed.agent.voice || hardcoded.voice,
    rules: {
      must: parsed.rules.hardRules.length > 0 ? parsed.rules.hardRules : hardcoded.rules.must,
      mustNot: parsed.rules.softRules.length > 0 ? parsed.rules.softRules : hardcoded.rules.mustNot,
      defaults: Object.keys(parsed.rules.defaults).length > 0 ? parsed.rules.defaults : hardcoded.rules.defaults,
    },
    skills:
      parsed.skills.skills.length > 0
        ? parsed.skills.skills.map((s) => s.name)
        : hardcoded.skills,
    templates: mergedTemplates.length > 0 ? mergedTemplates : hardcoded.templates,
  };
}

// ── Hooks ────────────────────────────────────────────────────────────────────

/** Fetch and merge image agents from runtime Markdown files */
export function useImageAgents(): UseAgentsResult<ImageSubAgent> {
  const [agents, setAgents] = useState<ImageSubAgent[]>(IMAGE_SUB_AGENTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<"runtime" | "hardcoded">("hardcoded");

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/agents?type=image");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: AgentsResponse = await res.json();

      if (data.image?.subAgents && Object.keys(data.image.subAgents).length > 0) {
        const merged = IMAGE_SUB_AGENTS.map((hardcoded) => {
          const parsed = data.image!.subAgents[hardcoded.id];
          if (parsed) {
            return mergeImageAgent(hardcoded.id, hardcoded, parsed);
          }
          return hardcoded;
        });
        setAgents(merged);
        setSource("runtime");
      } else {
        setAgents(IMAGE_SUB_AGENTS);
        setSource("hardcoded");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load agents");
      setAgents(IMAGE_SUB_AGENTS);
      setSource("hardcoded");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  return { agents, loading, error, refetch: fetchAgents, source };
}

/** Fetch and merge video agents from runtime Markdown files */
export function useVideoAgents(): UseAgentsResult<VideoSubAgent> {
  const [agents, setAgents] = useState<VideoSubAgent[]>(VIDEO_SUB_AGENTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<"runtime" | "hardcoded">("hardcoded");

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/agents?type=video");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: AgentsResponse = await res.json();

      if (data.video?.subAgents && Object.keys(data.video.subAgents).length > 0) {
        const merged = VIDEO_SUB_AGENTS.map((hardcoded) => {
          const parsed = data.video!.subAgents[hardcoded.id];
          if (parsed) {
            return mergeVideoAgent(hardcoded.id, hardcoded, parsed);
          }
          return hardcoded;
        });
        setAgents(merged);
        setSource("runtime");
      } else {
        setAgents(VIDEO_SUB_AGENTS);
        setSource("hardcoded");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load agents");
      setAgents(VIDEO_SUB_AGENTS);
      setSource("hardcoded");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  return { agents, loading, error, refetch: fetchAgents, source };
}
