"use client";

import { motion } from "framer-motion";
import {
  MagnifyingGlass,
  Lightning,
  FileText,
  CaretDown,
  Robot,
} from "@phosphor-icons/react";
import { useState } from "react";
import {
  VIDEO_SUB_AGENTS,
  type VideoSubAgent,
  type VideoAgentTemplate,
  type VideoAgentCategory,
} from "@/lib/agents";

export interface AgentScriptSelection {
  agentId: VideoAgentCategory;
  agentName: string;
  template: VideoAgentTemplate;
}

interface AgentScriptSelectorProps {
  selectedTemplate: AgentScriptSelection | null;
  onSelect: (selection: AgentScriptSelection | null) => void;
  onClose: () => void;
}

export default function AgentScriptSelector({
  selectedTemplate,
  onSelect,
  onClose,
}: AgentScriptSelectorProps) {
  const [search, setSearch] = useState("");
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

  const filteredAgents = VIDEO_SUB_AGENTS.filter((agent) => {
    if (!search) return true;
    const lower = search.toLowerCase();
    return (
      agent.name.toLowerCase().includes(lower) ||
      agent.description.toLowerCase().includes(lower) ||
      agent.templates.some(
        (t) =>
          t.name.toLowerCase().includes(lower) ||
          t.tags.some((tag) => tag.includes(lower))
      )
    );
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className="absolute bottom-[calc(100%+8px)] left-0 w-[340px] bg-[#0D0D0D]/95 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.7)] z-50 max-h-[420px] flex flex-col"
    >
      {/* Header */}
      <div className="px-3 pt-3 pb-1.5 flex items-center gap-2">
        <div className="w-5 h-5 rounded-md bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center">
          <Robot size={11} weight="fill" className="text-fuchsia-400" />
        </div>
        <span className="text-[11px] font-semibold text-zinc-300">
          Agent Script Templates
        </span>
        {selectedTemplate && (
          <button
            onClick={() => onSelect(null)}
            className="ml-auto text-[9px] text-zinc-500 hover:text-zinc-300 px-1.5 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Search */}
      <div className="px-2 pb-2 border-b border-white/[0.06]">
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
          <MagnifyingGlass
            size={13}
            className="text-zinc-500 flex-shrink-0"
          />
          <input
            type="text"
            placeholder="Search agents & templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-[12px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none w-full"
            autoFocus
          />
        </div>
      </div>

      {/* Agent list */}
      <div className="flex-1 overflow-y-auto p-1.5">
        {filteredAgents.map((agent) => (
          <AgentGroup
            key={agent.id}
            agent={agent}
            expanded={expandedAgent === agent.id}
            onToggle={() =>
              setExpandedAgent(expandedAgent === agent.id ? null : agent.id)
            }
            selectedTemplateId={selectedTemplate?.template.id}
            onSelectTemplate={(template) => {
              onSelect({
                agentId: agent.id,
                agentName: agent.name,
                template,
              });
              onClose();
            }}
            search={search}
          />
        ))}
        {filteredAgents.length === 0 && (
          <p className="text-[11px] text-zinc-600 text-center py-6">
            No agents or templates match your search
          </p>
        )}
      </div>
    </motion.div>
  );
}

function AgentGroup({
  agent,
  expanded,
  onToggle,
  selectedTemplateId,
  onSelectTemplate,
  search,
}: {
  agent: VideoSubAgent;
  expanded: boolean;
  onToggle: () => void;
  selectedTemplateId?: string;
  onSelectTemplate: (template: VideoAgentTemplate) => void;
  search: string;
}) {
  const filteredTemplates = search
    ? agent.templates.filter(
        (t) =>
          t.name.toLowerCase().includes(search.toLowerCase()) ||
          t.tags.some((tag) => tag.includes(search.toLowerCase()))
      )
    : agent.templates;

  const hasMatch = search ? filteredTemplates.length > 0 : true;
  const isExpanded = expanded || (search.length > 0 && hasMatch);

  return (
    <div className="mb-1">
      {/* Agent header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-white/[0.04] transition-colors group"
      >
        <Lightning
          size={13}
          weight="fill"
          className="text-fuchsia-400 flex-shrink-0"
        />
        <div className="flex-1 text-left min-w-0">
          <p className="text-[11px] font-semibold text-zinc-200 truncate">
            {agent.name}
          </p>
          <p className="text-[9px] text-zinc-500 truncate">{agent.voice}</p>
        </div>
        <span className="text-[9px] text-zinc-600 flex-shrink-0">
          {agent.templates.length}
        </span>
        <CaretDown
          size={10}
          weight="bold"
          className={`text-zinc-500 transition-transform duration-200 flex-shrink-0 ${
            isExpanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Templates */}
      {isExpanded && (
        <div className="ml-3 border-l border-white/[0.04] pl-2 mb-1">
          {filteredTemplates.map((template) => (
            <button
              key={template.id}
              onClick={() => onSelectTemplate(template)}
              className={`w-full flex items-start gap-2 px-2 py-1.5 rounded-lg transition-colors duration-100 ${
                selectedTemplateId === template.id
                  ? "bg-fuchsia-500/[0.07] text-fuchsia-400"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
              }`}
            >
              <FileText
                size={13}
                className="flex-shrink-0 mt-0.5"
              />
              <div className="text-left min-w-0">
                <p className="text-[11px] font-medium truncate">
                  {template.name}
                </p>
                <p className="text-[9px] text-zinc-600 truncate">
                  {template.duration} · {template.description}
                </p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {template.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="text-[7px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-white/[0.03] border border-white/[0.06] text-zinc-500"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
