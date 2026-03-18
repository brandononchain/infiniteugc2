"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { useCanvas } from "@/lib/canvas/context";
import { NODE_METADATA } from "@/lib/canvas/types";
import { WorkflowNodeCard } from "./WorkflowNodeCard";
import { ZoomIn, ZoomOut } from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   WorkflowCanvas — Full-screen infinite canvas.
   Click+drag anywhere (that isn't a node) to pan.
   Scroll to zoom. Nodes are draggable individually.
   ═══════════════════════════════════════════════════════════ */

export function WorkflowCanvas() {
  const { state, dispatch, selectNode } = useCanvas();
  const containerRef = useRef<HTMLDivElement>(null);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const panOriginRef = useRef({ x: 0, y: 0 });
  const didPanRef = useRef(false);

  const NODE_WIDTH = 220;
  const NODE_HEIGHT = 100;

  /* ─── Pan: mousedown on anything that isn't a node ─── */
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Don't pan if clicking on a node (has data-workflow-node) or a UI control
      const target = e.target as HTMLElement;
      if (target.closest("[data-workflow-node]") || target.closest("[data-canvas-ui]")) {
        return;
      }

      // Left mouse button only
      if (e.button !== 0) return;

      e.preventDefault();
      isPanningRef.current = true;
      didPanRef.current = false;
      panStartRef.current = { x: e.clientX, y: e.clientY };
      panOriginRef.current = { ...state.pan };

      // Capture pointer for reliable tracking even outside the element
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [state.pan]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isPanningRef.current) return;

      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;

      // Consider it a real pan if moved more than 3px (prevents accidental pans on clicks)
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        didPanRef.current = true;
      }

      dispatch({
        type: "SET_PAN",
        payload: {
          pan: {
            x: panOriginRef.current.x + dx,
            y: panOriginRef.current.y + dy,
          },
        },
      });
    },
    [dispatch]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (isPanningRef.current && !didPanRef.current) {
        // It was a click, not a drag — deselect node
        selectNode(null);
      }
      isPanningRef.current = false;
    },
    [selectNode]
  );

  /* ─── Zoom: wheel ─── */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.08 : 0.08;
      dispatch({ type: "SET_ZOOM", payload: { zoom: state.zoom + delta } });
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [state.zoom, dispatch]);

  /* ─── Render connections ─── */
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
          <path d={path} fill="none" stroke={meta.color} strokeWidth={3} opacity={0.08} filter="url(#glow)" />
          <path
            d={path}
            fill="none"
            stroke={meta.color}
            strokeWidth={1.5}
            opacity={0.35}
            strokeDasharray={fromNode.status === "empty" ? "6 4" : "none"}
          />
          {fromNode.status === "configured" && (
            <circle r="2" fill={meta.color} opacity={0.6}>
              <animateMotion dur="3s" repeatCount="indefinite" path={path} />
            </circle>
          )}
        </g>
      );
    });

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden select-none"
      style={{
        cursor: isPanningRef.current ? "grabbing" : "grab",
        background: "radial-gradient(ellipse at 50% 0%, rgba(0,188,255,0.02) 0%, transparent 60%)",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.02) 1px, transparent 1px)",
          backgroundSize: `${24 * state.zoom}px ${24 * state.zoom}px`,
          backgroundPosition: `${state.pan.x}px ${state.pan.y}px`,
        }}
      />

      {/* Transform layer */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          transform: `translate(${state.pan.x}px, ${state.pan.y}px) scale(${state.zoom})`,
          transformOrigin: "0 0",
        }}
      >
        {/* SVG connections */}
        <svg className="absolute inset-0 w-[3000px] h-[2000px]">
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

        {/* Nodes — pointer-events restored per-node */}
        <AnimatePresence>
          {state.nodes.map((node) => (
            <WorkflowNodeCard key={node.id} node={node} />
          ))}
        </AnimatePresence>
      </div>

      {/* ─── Bottom-left: zoom controls + status ─── */}
      <div data-canvas-ui className="absolute bottom-4 left-[68px] z-30 flex items-center gap-2">
        <div className="flex items-center gap-0.5 px-1.5 py-1 rounded-lg bg-black/40 border border-white/[0.06] backdrop-blur-md">
          <button
            onClick={() => dispatch({ type: "SET_ZOOM", payload: { zoom: state.zoom - 0.15 } })}
            className="w-6 h-6 flex items-center justify-center rounded text-white/25 hover:text-white/60 transition-colors"
          >
            <ZoomOut size={12} />
          </button>
          <span className="text-[9px] text-white/25 font-mono w-8 text-center select-none">
            {Math.round(state.zoom * 100)}%
          </span>
          <button
            onClick={() => dispatch({ type: "SET_ZOOM", payload: { zoom: state.zoom + 0.15 } })}
            className="w-6 h-6 flex items-center justify-center rounded text-white/25 hover:text-white/60 transition-colors"
          >
            <ZoomIn size={12} />
          </button>
        </div>

        {state.nodes.length > 0 && (
          <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-black/30 border border-white/[0.04] backdrop-blur-md">
            {state.nodes.map((n) => (
              <div
                key={n.id}
                className="w-1.5 h-1.5 rounded-full transition-colors"
                style={{
                  background:
                    n.status === "configured" ? "#22c55e"
                    : n.status === "processing" ? "#00BCFF"
                    : "rgba(255,255,255,0.1)",
                }}
                title={`${n.type}: ${n.status}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* ─── Empty state ─── */}
      {state.nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center">
              <svg width="28" height="16" viewBox="0 0 32 16" fill="rgba(255,255,255,0.06)" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" clipRule="evenodd" d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8c3.5 0 5.5-2 8-5.5C18.5 14 20.5 16 24 16c4.4 0 8-3.6 8-8s-3.6-8-8-8c-3.5 0-5.5 2-8 5.5C13.5 2 11.5 0 8 0zm0 4c-2.2 0-4 1.8-4 4s1.8 4 4 4c1.5 0 2.8-1 4.5-3.2L13.2 8l-.7-.8C10.8 5 9.5 4 8 4zm16 0c-1.5 0-2.8 1-4.5 3.2L18.8 8l.7.8C21.2 11 22.5 12 24 12c2.2 0 4-1.8 4-4s-1.8-4-4-4z" />
              </svg>
            </div>
            <p className="text-sm text-white/10 leading-relaxed">
              Use <span className="text-accent-400/30">CoPilot</span> or press <span className="text-white/20">+</span> to start building
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
