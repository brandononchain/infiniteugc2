/* ═══════════════════════════════════════════════════════════════════════════════
   API Route: GET /api/agents
   ═══════════════════════════════════════════════════════════════════════════════
   Reads agent Markdown files from agents/ directory at runtime and returns
   parsed, structured JSON. This means you can edit .md files and the agents
   update without rebuilding or touching TypeScript.

   Query params:
     ?type=image|video  — filter by agent domain (default: both)
     ?agent=product-ugc — get a specific sub-agent by ID
     ?master=true       — include master agent definitions
   ═══════════════════════════════════════════════════════════════════════════════ */

import { NextRequest, NextResponse } from "next/server";
import { readFile, readdir, access } from "fs/promises";
import { join } from "path";
import {
  parseAgentMd,
  parseSkillsMd,
  parseRulesMd,
  parseTemplatesMd,
  parseKnowledgeMd,
  type ParsedAgentBundle,
} from "@/lib/agents/markdown-parser";

const AGENTS_ROOT = join(process.cwd(), "agents");

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function readMdFile(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf-8");
  } catch {
    return null;
  }
}

async function loadAgentBundle(agentDir: string): Promise<ParsedAgentBundle | null> {
  const agentMd = await readMdFile(join(agentDir, "Agent.md"));
  if (!agentMd) return null;

  const skillsMd = await readMdFile(join(agentDir, "Skills.md"));
  const rulesMd = await readMdFile(join(agentDir, "Rules.md"));
  const templatesMd = await readMdFile(join(agentDir, "Templates.md"));
  const knowledgeMd = await readMdFile(join(agentDir, "Knowledge.md"));

  return {
    agent: parseAgentMd(agentMd),
    skills: skillsMd
      ? parseSkillsMd(skillsMd)
      : { skills: [], raw: "" },
    rules: rulesMd
      ? parseRulesMd(rulesMd)
      : { hardRules: [], softRules: [], qualityGates: [], defaults: {}, raw: "" },
    templates: templatesMd ? parseTemplatesMd(templatesMd) : [],
    knowledge: knowledgeMd ? parseKnowledgeMd(knowledgeMd) : undefined,
  };
}

interface AgentDomainResult {
  master: ParsedAgentBundle | null;
  subAgents: Record<string, ParsedAgentBundle>;
}

async function loadDomain(domainDir: string): Promise<AgentDomainResult> {
  const result: AgentDomainResult = { master: null, subAgents: {} };

  // Load master agent
  const masterDir = join(domainDir, "_master");
  if (await fileExists(masterDir)) {
    result.master = await loadAgentBundle(masterDir);
  }

  // Load sub-agents
  const subAgentsDir = join(domainDir, "sub-agents");
  if (await fileExists(subAgentsDir)) {
    const entries = await readdir(subAgentsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const bundle = await loadAgentBundle(join(subAgentsDir, entry.name));
        if (bundle) {
          result.subAgents[entry.name] = bundle;
        }
      }
    }
  }

  return result;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // "image" | "video" | null (both)
    const agentId = searchParams.get("agent"); // specific sub-agent ID
    const includeMaster = searchParams.get("master") !== "false";

    const response: Record<string, AgentDomainResult> = {};

    // Determine which domains to load
    const domains: { key: string; dir: string }[] = [];
    if (!type || type === "image") {
      domains.push({ key: "image", dir: join(AGENTS_ROOT, "image-generation") });
    }
    if (!type || type === "video") {
      domains.push({ key: "video", dir: join(AGENTS_ROOT, "video-generation") });
    }

    for (const { key, dir } of domains) {
      if (!(await fileExists(dir))) continue;
      const domainResult = await loadDomain(dir);

      // Filter to specific agent if requested
      if (agentId) {
        const filtered: Record<string, ParsedAgentBundle> = {};
        if (domainResult.subAgents[agentId]) {
          filtered[agentId] = domainResult.subAgents[agentId];
        }
        domainResult.subAgents = filtered;
      }

      // Optionally strip master
      if (!includeMaster) {
        domainResult.master = null;
      }

      response[key] = domainResult;
    }

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error("Failed to load agents:", error);
    return NextResponse.json(
      { error: "Failed to load agent definitions" },
      { status: 500 }
    );
  }
}
