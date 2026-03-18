"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { CanvasProvider, useCanvas } from "@/lib/canvas/context";
import { CanvasDock } from "@/components/canvas/CanvasDock";
import { TopBar } from "@/components/canvas/TopBar";
import { WorkflowCanvas } from "@/components/canvas/WorkflowCanvas";
import { CoPilotPanel } from "@/components/canvas/CoPilotPanel";
import { AssetDrawer } from "@/components/canvas/AssetDrawer";
import { NodeConfigPanel } from "@/components/canvas/NodeConfigPanel";
import { GeneratePanel } from "@/components/canvas/GeneratePanel";
import { NodePickerModal } from "@/components/canvas/NodePickerModal";

/* ═══════════════════════════════════════════════════════════
   Canvas Page — THE entire app. Full screen.
   TopBar top-left. Dock centered-left. Canvas fills all.
   Panels float. Node picker is a centered modal.
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
  const [showNodePicker, setShowNodePicker] = useState(false);

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Canvas (full screen, behind everything) */}
      <WorkflowCanvas />

      {/* TopBar — logo + workspace (top-left, floating) */}
      <TopBar />

      {/* Dock — centered left, floating */}
      <CanvasDock onOpenNodePicker={() => setShowNodePicker(true)} />

      {/* Floating panels */}
      <AnimatePresence mode="wait">
        {activePanel === "copilot" && <CoPilotPanel key="copilot" />}
        {activePanel === "assets" && <AssetDrawer key="assets" />}
        {activePanel === "nodeConfig" && <NodeConfigPanel key="nodeConfig" />}
        {activePanel === "generate" && <GeneratePanel key="generate" />}
      </AnimatePresence>

      {/* Node picker modal */}
      <AnimatePresence>
        {showNodePicker && (
          <NodePickerModal
            key="node-picker"
            onClose={() => setShowNodePicker(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
