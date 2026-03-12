/* ═══════════════════════════════════════════════════════════════════════════════
   AGENT MARKDOWN PARSER
   ═══════════════════════════════════════════════════════════════════════════════
   Parses Agent.md, Skills.md, Rules.md, Templates.md, Knowledge.md files
   into structured data the runtime can use.

   This runs server-side only. The parser reads .md files from the agents/
   directory and returns structured JSON.
   ═══════════════════════════════════════════════════════════════════════════════ */

// ── Parsed Types ─────────────────────────────────────────────────────────────

export interface ParsedAgent {
  name: string;
  role: string;
  domain: string;
  voice: string;
  sections: Record<string, string>;
  raw: string;
}

export interface ParsedSkills {
  skills: ParsedSkill[];
  raw: string;
}

export interface ParsedSkill {
  name: string;
  description: string;
  techniques: string[];
}

export interface ParsedRules {
  hardRules: string[];
  softRules: string[];
  qualityGates: string[];
  defaults: Record<string, string>;
  raw: string;
}

export interface ParsedTemplate {
  id: string;
  name: string;
  description: string;
  tags: string[];
  prompt?: string;       // for image templates
  duration?: string;     // for video templates
  structure?: string;    // for video templates
  sections?: ParsedScriptSection[];  // for video templates
  raw: string;
}

export interface ParsedScriptSection {
  label: string;
  duration: string;
  content: string;
  textOverlay?: string;
}

export interface ParsedKnowledge {
  sections: Record<string, string>;
  tables: ParsedTable[];
  raw: string;
}

export interface ParsedTable {
  name: string;
  headers: string[];
  rows: string[][];
}

export interface ParsedAgentBundle {
  agent: ParsedAgent;
  skills: ParsedSkills;
  rules: ParsedRules;
  templates: ParsedTemplate[];
  knowledge?: ParsedKnowledge;
}

// ── Parsers ──────────────────────────────────────────────────────────────────

/** Parse an Agent.md file */
export function parseAgentMd(content: string): ParsedAgent {
  const sections = parseSections(content);
  const name = extractFirstHeading(content) || "Unknown Agent";

  // Extract key-value pairs from sections
  const role = extractField(sections, ["role", "identity"]) || "";
  const domain = extractField(sections, ["domain", "specialization"]) || "";
  const voice = extractField(sections, ["voice", "tone", "personality"]) || "";

  return { name, role, domain, voice, sections, raw: content };
}

/** Parse a Skills.md file */
export function parseSkillsMd(content: string): ParsedSkills {
  const skills: ParsedSkill[] = [];
  const sections = content.split(/^## /m).filter(Boolean);

  for (const section of sections) {
    const lines = section.trim().split("\n");
    const name = lines[0]?.replace(/^#+\s*/, "").trim() || "";
    if (!name || name.startsWith("Skills")) continue;

    const description = lines
      .slice(1)
      .find((l) => l.trim() && !l.startsWith("-") && !l.startsWith("*") && !l.startsWith("#"))
      ?.trim() || "";

    const techniques = lines
      .filter((l) => /^\s*[-*]\s/.test(l))
      .map((l) => l.replace(/^\s*[-*]\s+/, "").trim());

    skills.push({ name, description, techniques });
  }

  return { skills, raw: content };
}

/** Parse a Rules.md file */
export function parseRulesMd(content: string): ParsedRules {
  const hardRules: string[] = [];
  const softRules: string[] = [];
  const qualityGates: string[] = [];
  const defaults: Record<string, string> = {};

  const sections = parseSections(content);

  // Find hard rules section
  for (const [key, value] of Object.entries(sections)) {
    const keyLower = key.toLowerCase();
    if (keyLower.includes("hard") || keyLower.includes("never break")) {
      hardRules.push(...extractListItems(value));
    } else if (keyLower.includes("soft") || keyLower.includes("prefer")) {
      softRules.push(...extractListItems(value));
    } else if (keyLower.includes("quality") || keyLower.includes("gate")) {
      qualityGates.push(...extractListItems(value));
    } else if (keyLower.includes("default")) {
      const items = extractListItems(value);
      for (const item of items) {
        const match = item.match(/\*\*(.+?)\*\*[:\s]+(.+)/);
        if (match) {
          defaults[match[1].trim()] = match[2].trim();
        } else {
          const colonMatch = item.match(/^(.+?):\s+(.+)/);
          if (colonMatch) {
            defaults[colonMatch[1].trim()] = colonMatch[2].trim();
          }
        }
      }
    }
  }

  return { hardRules, softRules, qualityGates, defaults, raw: content };
}

/** Parse a Templates.md file */
export function parseTemplatesMd(content: string): ParsedTemplate[] {
  const templates: ParsedTemplate[] = [];
  const templateBlocks = content.split(/^## template:\s*/m).filter(Boolean);

  for (const block of templateBlocks) {
    const lines = block.trim().split("\n");
    const firstLine = lines[0]?.trim() || "";

    // Skip the document header
    if (firstLine.startsWith("# ")) continue;

    const id = firstLine.replace(/^#+\s*/, "").trim() || `template-${templates.length}`;

    let name = "";
    let description = "";
    const tags: string[] = [];
    let prompt = "";
    let duration = "";
    let structure = "";
    const sections: ParsedScriptSection[] = [];
    const rawLines: string[] = [];

    for (const line of lines.slice(1)) {
      rawLines.push(line);
      const trimmed = line.trim();

      if (trimmed.startsWith("**Name**:")) {
        name = trimmed.replace("**Name**:", "").trim();
      } else if (trimmed.startsWith("**Description**:")) {
        description = trimmed.replace("**Description**:", "").trim();
      } else if (trimmed.startsWith("**Tags**:")) {
        tags.push(
          ...trimmed
            .replace("**Tags**:", "")
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        );
      } else if (trimmed.startsWith("**Prompt**:")) {
        prompt = trimmed.replace("**Prompt**:", "").trim();
      } else if (trimmed.startsWith("**Duration**:")) {
        duration = trimmed.replace("**Duration**:", "").trim();
      } else if (trimmed.startsWith("**Structure**:")) {
        structure = trimmed.replace("**Structure**:", "").trim();
      } else if (trimmed.startsWith("**Script**:")) {
        // Following lines until next ** are script sections
        // Script sections are parsed from [LABEL - Xs] content format
      } else if (trimmed.match(/^\[.+?\s*-\s*\d+s?\]/)) {
        const sectionMatch = trimmed.match(
          /^\[(.+?)\s*-\s*(\d+s?)\]\s*(.*)/
        );
        if (sectionMatch) {
          sections.push({
            label: sectionMatch[1].trim(),
            duration: sectionMatch[2].trim().replace(/s$/, "") + "s",
            content: sectionMatch[3].trim(),
          });
        }
      } else if (trimmed.match(/^\[TEXT:/)) {
        // Text overlay format: [TEXT: overlay text]
        if (sections.length > 0) {
          const textMatch = trimmed.match(/\[TEXT:\s*(.+?)\]/);
          if (textMatch) {
            sections[sections.length - 1].textOverlay = textMatch[1].trim();
          }
        }
      }
    }

    if (name || prompt || sections.length > 0) {
      templates.push({
        id,
        name: name || id,
        description,
        tags,
        prompt: prompt || undefined,
        duration: duration || undefined,
        structure: structure || undefined,
        sections: sections.length > 0 ? sections : undefined,
        raw: rawLines.join("\n"),
      });
    }
  }

  return templates;
}

/** Parse a Knowledge.md file */
export function parseKnowledgeMd(content: string): ParsedKnowledge {
  const sections = parseSections(content);
  const tables: ParsedTable[] = [];

  // Extract markdown tables
  const tableRegex = /^(\|.+\|)\n(\|[-: |]+\|)\n((?:\|.+\|\n?)+)/gm;
  let match;
  while ((match = tableRegex.exec(content)) !== null) {
    const headerLine = match[1];
    const dataLines = match[3].trim().split("\n");

    const headers = headerLine
      .split("|")
      .map((h) => h.trim())
      .filter(Boolean);
    const rows = dataLines.map((line) =>
      line
        .split("|")
        .map((c) => c.trim())
        .filter(Boolean)
    );

    // Find the nearest heading above this table for its name
    const before = content.slice(0, match.index);
    const lastHeading = before.match(/^#+\s+(.+)$/m);
    const tableName = lastHeading ? lastHeading[1] : `Table ${tables.length + 1}`;

    tables.push({ name: tableName, headers, rows });
  }

  return { sections, tables, raw: content };
}

// ── Utilities ────────────────────────────────────────────────────────────────

function parseSections(content: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const parts = content.split(/^(#{1,3})\s+(.+)$/m);

  for (let i = 1; i < parts.length; i += 3) {
    const heading = parts[i + 1]?.trim();
    const body = parts[i + 2]?.trim();
    if (heading && body) {
      sections[heading] = body;
    }
  }

  return sections;
}

function extractFirstHeading(content: string): string | null {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].replace(/[—–-]\s*.*$/, "").trim() : null;
}

function extractField(sections: Record<string, string>, keys: string[]): string | null {
  for (const key of keys) {
    for (const [sectionKey, value] of Object.entries(sections)) {
      if (sectionKey.toLowerCase().includes(key)) {
        // Return first non-empty line or first list item
        const lines = value.split("\n").filter((l) => l.trim());
        const firstLine = lines[0]?.trim();
        if (firstLine?.startsWith("-") || firstLine?.startsWith("*")) {
          return firstLine.replace(/^[-*]\s+/, "").trim();
        }
        return firstLine || null;
      }
    }
  }
  return null;
}

function extractListItems(content: string): string[] {
  return content
    .split("\n")
    .filter((l) => /^\s*\d+\.\s|^\s*[-*]\s/.test(l))
    .map((l) => l.replace(/^\s*\d+\.\s+|^\s*[-*]\s+/, "").trim());
}
