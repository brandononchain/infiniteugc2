"use client";

import { useEffect, useRef, useCallback } from "react";
import type { CanvasState, WorkflowNode, Connection } from "./types";

/* ═══════════════════════════════════════════════════════════
   useWorkflowPersistence — Saves/restores canvas state
   to/from localStorage.

   Production-grade:
   - Debounced saves (300ms) to avoid excessive writes
   - Schema versioning for forward compatibility
   - Validates restored state shape before applying
   - Handles quota errors gracefully
   - Cleans up stale data (> 30 days)
   ═══════════════════════════════════════════════════════════ */

const STORAGE_KEY = "infiniteugc_canvas_state";
const SCHEMA_VERSION = 1;
const DEBOUNCE_MS = 300;
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface PersistedState {
  version: number;
  timestamp: number;
  canvas: {
    nodes: WorkflowNode[];
    connections: Connection[];
    zoom: number;
    pan: { x: number; y: number };
  };
}

export function useWorkflowPersistence(
  state: CanvasState,
  onRestore: (saved: PersistedState["canvas"]) => void
) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasRestoredRef = useRef(false);
  const onRestoreRef = useRef(onRestore);
  onRestoreRef.current = onRestore;

  // Restore on mount (once)
  useEffect(() => {
    if (hasRestoredRef.current) return;
    hasRestoredRef.current = true;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const parsed: PersistedState = JSON.parse(raw);

      // Version check
      if (parsed.version !== SCHEMA_VERSION) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }

      // Age check
      if (Date.now() - parsed.timestamp > MAX_AGE_MS) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }

      // Shape validation
      if (!validatePersistedState(parsed)) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }

      // Only restore if there are actual nodes
      if (parsed.canvas.nodes.length > 0) {
        onRestoreRef.current(parsed.canvas);
      }
    } catch {
      // Corrupt data — remove it
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Save on state changes (debounced)
  const save = useCallback((currentState: CanvasState) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      try {
        const persisted: PersistedState = {
          version: SCHEMA_VERSION,
          timestamp: Date.now(),
          canvas: {
            nodes: currentState.nodes,
            connections: currentState.connections,
            zoom: currentState.zoom,
            pan: currentState.pan,
          },
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
      } catch {
        // Quota exceeded or other storage error — fail silently
      }
    }, DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    // Don't save until we've had a chance to restore
    if (!hasRestoredRef.current) return;
    save(state);
  }, [state, save]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);
}

function validatePersistedState(data: unknown): data is PersistedState {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;

  if (typeof obj.version !== "number") return false;
  if (typeof obj.timestamp !== "number") return false;
  if (!obj.canvas || typeof obj.canvas !== "object") return false;

  const canvas = obj.canvas as Record<string, unknown>;
  if (!Array.isArray(canvas.nodes)) return false;
  if (!Array.isArray(canvas.connections)) return false;
  if (typeof canvas.zoom !== "number") return false;
  if (!canvas.pan || typeof canvas.pan !== "object") return false;

  // Validate individual nodes have required fields
  for (const node of canvas.nodes as unknown[]) {
    if (!node || typeof node !== "object") return false;
    const n = node as Record<string, unknown>;
    if (typeof n.id !== "string") return false;
    if (typeof n.type !== "string") return false;
    if (!n.position || typeof n.position !== "object") return false;
    if (typeof n.status !== "string") return false;
  }

  // Validate connections
  for (const conn of canvas.connections as unknown[]) {
    if (!conn || typeof conn !== "object") return false;
    const c = conn as Record<string, unknown>;
    if (typeof c.id !== "string") return false;
    if (typeof c.from !== "string") return false;
    if (typeof c.to !== "string") return false;
  }

  return true;
}
