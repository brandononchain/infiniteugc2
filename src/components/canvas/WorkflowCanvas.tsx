"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCanvas } from "@/lib/canvas/context";
import { NODE_METADATA, type WorkflowNodeType } from "@/lib/canvas/types";
import { WorkflowNodeCard } from "./WorkflowNodeCard";
import { Plus, ZoomIn, ZoomOut, RotateCcw, Layout } from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   WorkflowCanvas — Visual node-based workflow builder
   ═══════════════════════════════════════════════════════════ */

export function WorkflowCanvas() {
  const { state, dispatch, selectNode, loadDefaultWorkflow, clearCanvas } = useCanvas();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [showAddMenu, setShowAddMenu] = useState(false);

  // Node dimensions for connection drawing
  const NODE_WIDTH = 220;
  const NODE_HEIGHT = 100;

  /* ─── Pan handling ─── */
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains("canvas-grid")) {
        selectNode(null);
        if (e.button === 0) {
          setIsPanning(true);
          setPanStart({ x: e.clientX - state.pan.x, y: e.clientY - state.pan.y });
        }
      }
    },
    [state.pan, selectNode]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        dispatch({
          type: "SET_PAN",
          payload: { pan: { x: e.clientX - panStart.x, y: e.clientY - panStart.y } },
        });
      }
    },
    [isPanning, panStart, dispatch]
  );

  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  /* ─── Zoom ─── */
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      dispatch({ type: "SET_ZOOM", payload: { zoom: state.zoom + delta } });
    },
    [state.zoom, dispatch]
  );

  /* ─── Draw connections as SVG bezier curves ─── */
  const renderConnections = () => {
    return state.connections.map((conn) => {
      const fromNode = state.nodes.find((n) => n.id === conn.from);
      const toNode = state.nodes.find((n) => n.id === conn.to);
      if (!fromNode || !toNode) return null;

      const x1 = fromNode.position.x + NODE_WIDTH;
      const y1 = fromNode.position.y + NODE_HEIGHT / 2;
      const x2 = toNode.position.x;
      const y2 = toNode.position.y + NODE_HEIGHT / 2;

      const midX = (x1 + x2) / 2;
      const path = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;

      const fromMeta = NODE_METADATA[fromNode.type];

      return (
        <g key={conn.id}>
          {/* Glow */}
          <path
            d={path}
            fill="none"
            stroke={fromMeta.color}
            strokeWidth={3}
            opacity={0.15}
            filter="url(#glow)"
          />
          {/* Line */}
          <path
            d={path}
            fill="none"
            stroke={fromMeta.color}
            strokeWidth={1.5}
            opacity={0.5}
            strokeDasharray={fromNode.status === "empty" ? "6 4" : "none"}
          />
          {/* Animated dot */}
          {fromNode.status === "configured" && (
            <circle r="3" fill={fromMeta.color} opacity={0.8}>
              <animateMotion dur="3s" repeatCount="indefinite" path={path} />
            </circle>
          )}
        </g>
      );
    });
  };

  /* ─── Node add menu ─── */
  const availableNodes = (
    Object.keys(NODE_METADATA) as WorkflowNodeType[]
  ).filter((type) => !state.nodes.some((n) => n.type === type));

  const handleAddNode = (type: WorkflowNodeType) => {
    dispatch({
      type: "ADD_NODE",
      payload: { nodeType: type },
    });
    setShowAddMenu(false);
  };

  return (
    <div className="relative flex-1 overflow-hidden rounded-2xl" style={{ background: "rgba(10, 10, 13, 0.6)" }}>
      {/* ─── Toolbar ─── */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        <button
          onClick={loadDefaultWorkflow}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/60 hover:text-white/90 bg-white/5 hover:bg-white/10 border border-white/8 transition-all"
          title="Load default workflow"
        >
          <Layout size={13} />
          Template
        </button>
        <div className="relative">
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/60 hover:text-white/90 bg-white/5 hover:bg-white/10 border border-white/8 transition-all"
          >
            <Plus size={13} />
            Add Node
          </button>
          <AnimatePresence>
            {showAddMenu && availableNodes.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                className="absolute top-full mt-2 left-0 z-30 min-w-[200px] rounded-xl p-1.5 border border-white/8"
                style={{ background: "rgba(20, 20, 23, 0.95)", backdropFilter: "blur(20px)" }}
              >
                {availableNodes.map((type) => {
                  const meta = NODE_METADATA[type];
                  return (
                    <button
                      key={type}
                      onClick={() => handleAddNode(type)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/8 transition-all text-left"
                    >
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center text-[10px]"
                        style={{ background: `${meta.color}20`, color: meta.color }}
                      >
                        {meta.label[0]}
                      </div>
                      <div>
                        <div className="font-medium text-xs">{meta.label}</div>
                        <div className="text-[10px] text-white/40">{meta.description}</div>
                      </div>
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <button
          onClick={clearCanvas}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/40 hover:text-red-400 bg-white/5 hover:bg-red-500/10 border border-white/8 transition-all"
          title="Clear canvas"
        >
          <RotateCcw size={13} />
        </button>
      </div>

      {/* ─── Zoom controls ─── */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-1 px-1.5 py-1 rounded-lg bg-white/5 border border-white/8">
        <button
          onClick={() => dispatch({ type: "SET_ZOOM", payload: { zoom: state.zoom - 0.1 } })}
          className="w-7 h-7 flex items-center justify-center rounded text-white/40 hover:text-white/80 transition-colors"
        >
          <ZoomOut size={14} />
        </button>
        <span className="text-[10px] text-white/40 font-mono w-10 text-center">
          {Math.round(state.zoom * 100)}%
        </span>
        <button
          onClick={() => dispatch({ type: "SET_ZOOM", payload: { zoom: state.zoom + 0.1 } })}
          className="w-7 h-7 flex items-center justify-center rounded text-white/40 hover:text-white/80 transition-colors"
        >
          <ZoomIn size={14} />
        </button>
      </div>

      {/* ─── Canvas area ─── */}
      <div
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {/* Grid background */}
        <div
          className="canvas-grid absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)
            `,
            backgroundSize: `${24 * state.zoom}px ${24 * state.zoom}px`,
            backgroundPosition: `${state.pan.x}px ${state.pan.y}px`,
          }}
        />

        {/* Transform layer */}
        <div
          className="absolute inset-0"
          style={{
            transform: `translate(${state.pan.x}px, ${state.pan.y}px) scale(${state.zoom})`,
            transformOrigin: "0 0",
          }}
        >
          {/* SVG connections */}
          <svg className="absolute inset-0 w-[2000px] h-[1200px] pointer-events-none">
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {renderConnections()}
          </svg>

          {/* Nodes */}
          {state.nodes.map((node) => (
            <WorkflowNodeCard key={node.id} node={node} />
          ))}
        </div>

        {/* Empty state */}
        {state.nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center">
                <Layout size={28} className="text-white/20" />
              </div>
              <h3 className="text-lg font-semibold text-white/30 mb-1">Empty Canvas</h3>
              <p className="text-sm text-white/20 max-w-xs">
                Use CoPilot to describe what you want, or click{" "}
                <span className="text-accent-400/60">Template</span> to start with a default workflow
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
