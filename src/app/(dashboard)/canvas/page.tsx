"use client";

import { useEffect, useState } from "react";
import { CanvasProvider, useCanvas } from "@/lib/canvas/context";
import { WorkflowCanvas } from "@/components/canvas/WorkflowCanvas";
import { CoPilotPanel } from "@/components/canvas/CoPilotPanel";
import { NodeConfigPanel } from "@/components/canvas/NodeConfigPanel";
import { GenerateBar } from "@/components/canvas/GenerateBar";
import { supabaseQueries } from "@/lib/api";
import type { Avatar, Voice, Script } from "@/types";
import { useRouter } from "next/navigation";

/* ═══════════════════════════════════════════════════════════
   Canvas Page — Main Canvas + CoPilot Experience
   ═══════════════════════════════════════════════════════════ */

export default function CanvasPage() {
  return (
    <CanvasProvider>
      <CanvasPageInner />
    </CanvasProvider>
  );
}

function CanvasPageInner() {
  const { state } = useCanvas();
  const router = useRouter();
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Load user assets
  useEffect(() => {
    async function load() {
      const [a, v, s] = await Promise.all([
        supabaseQueries.getAvatars(),
        supabaseQueries.getVoices(),
        supabaseQueries.getScripts(),
      ]);
      setAvatars(a);
      setVoices(v);
      setScripts(s);
      setLoaded(true);
    }
    load();
  }, []);

  const handleJobCreated = (jobId: string) => {
    // Navigate to running page to track the job
    setTimeout(() => router.push("/running"), 1500);
  };

  return (
    <div className="flex flex-col h-full">
      {/* ─── Header ─── */}
      <div className="shrink-0 px-6 py-4 flex items-center justify-between border-b border-white/6">
        <div>
          <h1 className="text-lg font-bold text-white/90 tracking-tight">Canvas</h1>
          <p className="text-xs text-white/35 mt-0.5">
            Build your video workflow visually or let CoPilot do it for you
          </p>
        </div>
        <div className="flex items-center gap-3">
          {state.nodes.length > 0 && (
            <div className="flex items-center gap-1.5">
              {state.nodes.map((n) => (
                <div
                  key={n.id}
                  className="w-2 h-2 rounded-full transition-colors"
                  style={{
                    background:
                      n.status === "configured"
                        ? "#22c55e"
                        : n.status === "processing"
                          ? "#00BCFF"
                          : "rgba(255,255,255,0.15)",
                  }}
                  title={`${n.type}: ${n.status}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Main area: Canvas + Panels ─── */}
      <div className="flex-1 flex gap-3 p-3 min-h-0 overflow-hidden">
        {/* Canvas */}
        <WorkflowCanvas />

        {/* Side panels — Config or CoPilot */}
        <div className="flex flex-col gap-3 min-h-0">
          {state.selectedNodeId && loaded ? (
            <NodeConfigPanel
              avatars={avatars}
              voices={voices}
              scripts={scripts}
            />
          ) : (
            <CoPilotPanel />
          )}
        </div>
      </div>

      {/* ─── Generate Bar ─── */}
      <GenerateBar onJobCreated={handleJobCreated} />
    </div>
  );
}
