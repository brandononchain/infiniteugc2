"use client";

import { useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCanvas } from "@/lib/canvas/context";
import { NODE_METADATA, type WorkflowNodeType } from "@/lib/canvas/types";
import { WorkflowNodeCard } from "./WorkflowNodeCard";
import { Plus, ZoomIn, ZoomOut, Layout } from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   WorkflowCanvas — Full-screen infinite canvas
   This IS the entire app. No headers, no wrappers.
   ═══════════════════════════════════════════════════════════ */

export function WorkflowCanvas() {
  const { state, dispatch, selectNode, loadDefaultWorkflow } = useCanvas();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [showAddMenu, setShowAddMenu] = useState(false);

  const NODE_WIDTH = 220;
  const NODE_HEIGHT = 100;

  /* ─── Pan ─── */
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (
        e.target === canvasRef.current ||
        (e.target as HTMLElement).classList.contains("canvas-grid")
      ) {
        selectNode(null);
        setShowAddMenu(false);
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
      const delta = e.deltaY > 0 ? -0.06 : 0.06;
      dispatch({ type: "SET_ZOOM", payload: { zoom: state.zoom + delta } });
    },
    [state.zoom, dispatch]
  );

  /* ─── Connections ─── */
  const renderConnections = () =>
    state.connections.map((conn) => {
      const fromNode = state.nodes.find((n) => n.id === conn.from);
      const toNode = state.nodes.find((n) => n.id === conn.to);
      if (!fromNode || !toNode) return null;

      const x1 = fromNode.position.x + NODE_WIDTH;
      const y1 = fromNode.position.y + NODE_HEIGHT / 2;
      const x2 = toNode.position.x;
      const y2 = toNode.position.y + NODE_HEIGHT / 2;
      const midX = (x1 + x2) / 2;
      const path = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
      const meta = NODE_METADATA[fromNode.type];

      return (
        <g key={conn.id}>
          <path d={path} fill="none" stroke={meta.color} strokeWidth={3} opacity={0.1} filter="url(#glow)" />
          <path
            d={path}
            fill="none"
            stroke={meta.color}
            strokeWidth={1.5}
            opacity={0.4}
            strokeDasharray={fromNode.status === "empty" ? "6 4" : "none"}
          />
          {fromNode.status === "configured" && (
            <circle r="2.5" fill={meta.color} opacity={0.7}>
              <animateMotion dur="3s" repeatCount="indefinite" path={path} />
            </circle>
          )}
        </g>
      );
    });

  /* ─── Add node menu ─── */
  const available = (Object.keys(NODE_METADATA) as WorkflowNodeType[]).filter(
    (t) => !state.nodes.some((n) => n.type === t)
  );

  return (
    <div
      className="absolute inset-0 overflow-hidden cursor-grab active:cursor-grabbing"
      style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(0,188,255,0.03) 0%, transparent 60%)" }}
    >
      {/* ─── Bottom-left toolbar ─── */}
      <div className="absolute bottom-4 left-4 z-30 flex items-center gap-2">
        {/* Zoom */}
        <div className="flex items-center gap-0.5 px-1.5 py-1 rounded-lg bg-black/40 border border-white/[0.06] backdrop-blur-md">
          <button
            onClick={() => dispatch({ type: "SET_ZOOM", payload: { zoom: state.zoom - 0.15 } })}
            className="w-6 h-6 flex items-center justify-center rounded text-white/30 hover:text-white/70 transition-colors"
          >
            <ZoomOut size={13} />
          </button>
          <span className="text-[9px] text-white/30 font-mono w-9 text-center select-none">
            {Math.round(state.zoom * 100)}%
          </span>
          <button
            onClick={() => dispatch({ type: "SET_ZOOM", payload: { zoom: state.zoom + 0.15 } })}
            className="w-6 h-6 flex items-center justify-center rounded text-white/30 hover:text-white/70 transition-colors"
          >
            <ZoomIn size={13} />
          </button>
        </div>

        {/* Template */}
        {state.nodes.length === 0 && (
          <button
            onClick={loadDefaultWorkflow}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-white/40 hover:text-white/70 bg-black/40 hover:bg-black/50 border border-white/[0.06] backdrop-blur-md transition-all"
          >
            <Layout size={12} />
            Load Template
          </button>
        )}

        {/* Add node */}
        {available.length > 0 && state.nodes.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-white/40 hover:text-white/70 bg-black/40 hover:bg-black/50 border border-white/[0.06] backdrop-blur-md transition-all"
            >
              <Plus size={12} />
              Add Node
            </button>
            <AnimatePresence>
              {showAddMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="absolute bottom-full mb-2 left-0 min-w-[180px] rounded-xl p-1.5 border border-white/[0.08] shadow-xl"
                  style={{ background: "rgba(15, 15, 18, 0.95)", backdropFilter: "blur(20px)" }}
                >
                  {available.map((type) => {
                    const meta = NODE_METADATA[type];
                    return (
                      <button
                        key={type}
                        onClick={() => {
                          dispatch({ type: "ADD_NODE", payload: { nodeType: type } });
                          setShowAddMenu(false);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] text-white/50 hover:text-white/80 hover:bg-white/[0.06] transition-all"
                      >
                        <div
                          className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold"
                          style={{ background: `${meta.color}15`, color: meta.color }}
                        >
                          {meta.label[0]}
                        </div>
                        {meta.label}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Node status dots */}
        {state.nodes.length > 0 && (
          <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-black/30 border border-white/[0.04] backdrop-blur-md">
            {state.nodes.map((n) => (
              <div
                key={n.id}
                className="w-1.5 h-1.5 rounded-full transition-colors"
                style={{
                  background:
                    n.status === "configured"
                      ? "#22c55e"
                      : n.status === "processing"
                        ? "#00BCFF"
                        : "rgba(255,255,255,0.12)",
                }}
                title={`${n.type}: ${n.status}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* ─── Canvas surface ─── */}
      <div
        ref={canvasRef}
        className="w-full h-full"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {/* Grid */}
        <div
          className="canvas-grid absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.025) 1px, transparent 1px)",
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
          <svg className="absolute inset-0 w-[2400px] h-[1400px] pointer-events-none">
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

          <AnimatePresence>
            {state.nodes.map((node) => (
              <WorkflowNodeCard key={node.id} node={node} />
            ))}
          </AnimatePresence>
        </div>

        {/* Empty state */}
        {state.nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                <svg width="32" height="18" viewBox="0 0 32 16" fill="rgba(255,255,255,0.08)" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8c3.5 0 5.5-2 8-5.5C18.5 14 20.5 16 24 16c4.4 0 8-3.6 8-8s-3.6-8-8-8c-3.5 0-5.5 2-8 5.5C13.5 2 11.5 0 8 0zm0 4c-2.2 0-4 1.8-4 4s1.8 4 4 4c1.5 0 2.8-1 4.5-3.2L13.2 8l-.7-.8C10.8 5 9.5 4 8 4zm16 0c-1.5 0-2.8 1-4.5 3.2L18.8 8l.7.8C21.2 11 22.5 12 24 12c2.2 0 4-1.8 4-4s-1.8-4-4-4z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white/20 mb-2">InfiniteUGC</h2>
              <p className="text-sm text-white/12 leading-relaxed">
                Open <span className="text-accent-400/40">CoPilot</span> and tell it what you want to create.
                <br />
                Or click <span className="text-white/25">Load Template</span> to start manually.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
