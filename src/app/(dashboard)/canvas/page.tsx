"use client";

import { AnimatePresence } from "framer-motion";
import { CanvasProvider, useCanvas } from "@/lib/canvas/context";
import { CanvasDock } from "@/components/canvas/CanvasDock";
import { WorkflowCanvas } from "@/components/canvas/WorkflowCanvas";
import { CoPilotPanel } from "@/components/canvas/CoPilotPanel";
import { AssetDrawer } from "@/components/canvas/AssetDrawer";
import { NodeConfigPanel } from "@/components/canvas/NodeConfigPanel";
import { GeneratePanel } from "@/components/canvas/GeneratePanel";

/* ═══════════════════════════════════════════════════════════
   Canvas Page — THE entire app. Full screen.
   Dock on left. Canvas fills everything. Panels float.
   ═══════════════════════════════════════════════════════════ */

export default function CanvasPage() {
  return (
    <CanvasProvider>
      <CanvasApp />
    </CanvasProvider>
  );
}

function CanvasApp() {
  const { activePanel } = useCanvas();

  return (
    <div className="flex h-full w-full">
      {/* ─── Dock ─── */}
      <CanvasDock />

      {/* ─── Canvas (fills everything) ─── */}
      <div className="flex-1 relative min-w-0">
        <WorkflowCanvas />

        {/* ─── Floating panels ─── */}
        <AnimatePresence mode="wait">
          {activePanel === "copilot" && <CoPilotPanel key="copilot" />}
          {activePanel === "assets" && <AssetDrawer key="assets" />}
          {activePanel === "nodeConfig" && <NodeConfigPanel key="nodeConfig" />}
          {activePanel === "generate" && <GeneratePanel key="generate" />}
        </AnimatePresence>
      </div>
    </div>
  );
}
