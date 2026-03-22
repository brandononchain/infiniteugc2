"use client";

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useState,
  type ReactNode,
  type Dispatch,
} from "react";
import type {
  CanvasState,
  WorkflowNode,
  WorkflowNodeType,
  Connection,
  NodeData,
  NodeStatus,
  CoPilotMessage,
  CoPilotAction,
} from "./types";
import {
  DEFAULT_NODE_POSITIONS,
  DEFAULT_CONNECTIONS,
} from "./types";
import { validateConnection } from "./connection-rules";
import { useWorkflowPersistence } from "./use-workflow-persistence";
import { useJobPoller } from "./use-job-poller";
import type { Job } from "@/types";

/* ═══════════════════════════════════════════════════════════
   Canvas Reducer
   ═══════════════════════════════════════════════════════════ */

type CanvasAction =
  | { type: "ADD_NODE"; payload: { nodeType: WorkflowNodeType; data?: Partial<NodeData>; position?: { x: number; y: number } } }
  | { type: "REMOVE_NODE"; payload: { nodeId: string } }
  | { type: "UPDATE_NODE_DATA"; payload: { nodeId: string; data: Partial<NodeData> } }
  | { type: "UPDATE_NODE_STATUS"; payload: { nodeId: string; status: NodeStatus } }
  | { type: "MOVE_NODE"; payload: { nodeId: string; position: { x: number; y: number } } }
  | { type: "SELECT_NODE"; payload: { nodeId: string | null } }
  | { type: "ADD_CONNECTION"; payload: { from: string; to: string } }
  | { type: "REMOVE_CONNECTION"; payload: { connectionId: string } }
  | { type: "SET_ZOOM"; payload: { zoom: number } }
  | { type: "SET_PAN"; payload: { pan: { x: number; y: number } } }
  | { type: "CLEAR_CANVAS" }
  | { type: "LOAD_DEFAULT_WORKFLOW" }
  | { type: "RESTORE_STATE"; payload: { nodes: WorkflowNode[]; connections: Connection[]; zoom: number; pan: { x: number; y: number } } }
  | { type: "APPLY_COPILOT_ACTIONS"; payload: { actions: CoPilotAction[] } };

let nodeCounter = 0;
function genNodeId(type: WorkflowNodeType): string {
  return `${type}-${++nodeCounter}-${Date.now().toString(36)}`;
}

function genConnectionId(): string {
  return `conn-${++nodeCounter}-${Date.now().toString(36)}`;
}

const initialState: CanvasState = {
  nodes: [],
  connections: [],
  selectedNodeId: null,
  zoom: 1,
  pan: { x: 0, y: 0 },
};

function createDefaultNode(type: WorkflowNodeType, data?: Partial<NodeData>, position?: { x: number; y: number }): WorkflowNode {
  const defaultData = getDefaultNodeData(type);
  return {
    id: genNodeId(type),
    type,
    position: position || DEFAULT_NODE_POSITIONS[type],
    data: { ...defaultData, ...data } as NodeData,
    status: data && Object.keys(data).length > 0 ? "configured" : "empty",
  };
}

function getDefaultNodeData(type: WorkflowNodeType): NodeData {
  switch (type) {
    case "product":
      return { name: "", description: "" };
    case "avatar":
      return {};
    case "script":
      return {};
    case "voice":
      return {};
    case "provider":
      return { provider: "heygen" as const };
    case "captions":
      return { enabled: true };
    case "output":
      return {};
    case "image_gen":
      return { model: "seedream_4_5", aspectRatio: "1:1", count: 1 };
    case "voice_clone":
      return { sourceType: "upload" };
    case "storyboard":
      return { scenes: [], totalScenes: 0 };
    case "premium_video":
      return { videoProvider: "veo3" };
    case "mass_batch":
      return { videoProvider: "hedra_avatar", captionEnabled: true };
    case "motion_control":
      return { lipsyncModel: "lipsync-2", voiceSource: "clone_from_video" };
    case "broll":
      return { model: "kling-2.6", duration: 5 };
    case "hooks":
      return { sourceType: "job" };
    case "dubbing":
      return { mode: "quality", captionEnabled: false, languages: [] };
    case "lipsync":
      return { model: "lipsync-2" };
    case "clone":
      return { mode: "standard", preferredModel: "veo3" };
  }
}

function canvasReducer(state: CanvasState, action: CanvasAction): CanvasState {
  switch (action.type) {
    case "ADD_NODE": {
      const { nodeType, data, position } = action.payload;
      const existing = state.nodes.find((n) => n.type === nodeType);
      if (existing) {
        return {
          ...state,
          nodes: state.nodes.map((n) =>
            n.id === existing.id
              ? {
                  ...n,
                  data: { ...n.data, ...data } as NodeData,
                  status: data && Object.keys(data).length > 0 ? "configured" : n.status,
                }
              : n
          ),
        };
      }
      const node = createDefaultNode(nodeType, data as Partial<NodeData>, position);
      return { ...state, nodes: [...state.nodes, node] };
    }

    case "REMOVE_NODE": {
      const { nodeId } = action.payload;
      return {
        ...state,
        nodes: state.nodes.filter((n) => n.id !== nodeId),
        connections: state.connections.filter(
          (c) => c.from !== nodeId && c.to !== nodeId
        ),
        selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
      };
    }

    case "UPDATE_NODE_DATA": {
      const { nodeId, data } = action.payload;
      return {
        ...state,
        nodes: state.nodes.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, ...data } as NodeData, status: "configured" }
            : n
        ),
      };
    }

    case "UPDATE_NODE_STATUS": {
      const { nodeId, status } = action.payload;
      return {
        ...state,
        nodes: state.nodes.map((n) =>
          n.id === nodeId ? { ...n, status } : n
        ),
      };
    }

    case "MOVE_NODE": {
      const { nodeId, position } = action.payload;
      return {
        ...state,
        nodes: state.nodes.map((n) =>
          n.id === nodeId ? { ...n, position } : n
        ),
      };
    }

    case "SELECT_NODE":
      return { ...state, selectedNodeId: action.payload.nodeId };

    case "ADD_CONNECTION": {
      const { from, to } = action.payload;

      // Validate the connection using rules
      const fromNode = state.nodes.find((n) => n.id === from);
      const toNode = state.nodes.find((n) => n.id === to);
      if (!fromNode || !toNode) return state;

      const validation = validateConnection(fromNode, toNode, state.connections);
      if (!validation.valid) return state;

      return {
        ...state,
        connections: [...state.connections, { id: genConnectionId(), from, to }],
      };
    }

    case "REMOVE_CONNECTION":
      return {
        ...state,
        connections: state.connections.filter((c) => c.id !== action.payload.connectionId),
      };

    case "SET_ZOOM":
      return { ...state, zoom: Math.max(0.25, Math.min(2.5, action.payload.zoom)) };

    case "SET_PAN":
      return { ...state, pan: action.payload.pan };

    case "CLEAR_CANVAS":
      return { ...initialState };

    case "RESTORE_STATE":
      return {
        ...state,
        nodes: action.payload.nodes,
        connections: action.payload.connections,
        zoom: action.payload.zoom,
        pan: action.payload.pan,
        selectedNodeId: null,
      };

    case "LOAD_DEFAULT_WORKFLOW": {
      const nodes: WorkflowNode[] = (
        ["product", "avatar", "script", "voice", "provider", "captions", "output"] as WorkflowNodeType[]
      ).map((type) => createDefaultNode(type));

      const connections: Connection[] = DEFAULT_CONNECTIONS.map(({ from, to }) => {
        const fromNode = nodes.find((n) => n.type === from)!;
        const toNode = nodes.find((n) => n.type === to)!;
        return { id: genConnectionId(), from: fromNode.id, to: toNode.id };
      });

      return { ...state, nodes, connections, selectedNodeId: null };
    }

    case "APPLY_COPILOT_ACTIONS": {
      let newState = state;
      // Auto-load default workflow if canvas is empty and we're configuring nodes
      const hasConfigOrAdd = action.payload.actions.some(
        (a) => a.type === "add_node" || a.type === "configure_node"
      );
      if (newState.nodes.length === 0 && hasConfigOrAdd) {
        newState = canvasReducer(newState, { type: "LOAD_DEFAULT_WORKFLOW" });
      }
      for (const act of action.payload.actions) {
        switch (act.type) {
          case "add_node": {
            const nodeType = act.payload.nodeType as WorkflowNodeType;
            const data = act.payload.data as Partial<NodeData>;
            newState = canvasReducer(newState, {
              type: "ADD_NODE",
              payload: { nodeType, data },
            });
            break;
          }
          case "configure_node": {
            const targetType = act.payload.nodeType as WorkflowNodeType;
            const targetNode = newState.nodes.find((n) => n.type === targetType);
            if (targetNode) {
              newState = canvasReducer(newState, {
                type: "UPDATE_NODE_DATA",
                payload: { nodeId: targetNode.id, data: act.payload.data as Partial<NodeData> },
              });
            }
            break;
          }
          case "connect_nodes": {
            const fromType = act.payload.from as WorkflowNodeType;
            const toType = act.payload.to as WorkflowNodeType;
            const fromNode = newState.nodes.find((n) => n.type === fromType);
            const toNode = newState.nodes.find((n) => n.type === toType);
            if (fromNode && toNode) {
              newState = canvasReducer(newState, {
                type: "ADD_CONNECTION",
                payload: { from: fromNode.id, to: toNode.id },
              });
            }
            break;
          }
          case "clear_canvas":
            newState = canvasReducer(newState, { type: "CLEAR_CANVAS" });
            break;
        }
      }
      return newState;
    }

    default:
      return state;
  }
}

/* ═══════════════════════════════════════════════════════════
   CoPilot Reducer
   ═══════════════════════════════════════════════════════════ */

interface CoPilotState {
  messages: CoPilotMessage[];
  isThinking: boolean;
}

type CoPilotReducerAction =
  | { type: "ADD_MESSAGE"; payload: CoPilotMessage }
  | { type: "SET_THINKING"; payload: boolean }
  | { type: "CLEAR_MESSAGES" };

function copilotReducer(state: CoPilotState, action: CoPilotReducerAction): CoPilotState {
  switch (action.type) {
    case "ADD_MESSAGE":
      return { ...state, messages: [...state.messages, action.payload] };
    case "SET_THINKING":
      return { ...state, isThinking: action.payload };
    case "CLEAR_MESSAGES":
      return { messages: [], isThinking: false };
    default:
      return state;
  }
}

const initialCoPilotState: CoPilotState = {
  messages: [
    {
      id: "welcome",
      role: "assistant",
      content:
        "Tell me what you want to create and I'll build everything for you.\n\nTry:\n- \"UGC video of a skincare product, girl in a dorm room\"\n- \"Testimonial for a fitness app, professional tone\"\n- \"TikTok ad for sneakers, energetic and viral\"",
      timestamp: Date.now(),
    },
  ],
  isThinking: false,
};

/* ═══════════════════════════════════════════════════════════
   Active Jobs State (for polling)
   ═══════════════════════════════════════════════════════════ */

interface ActiveJobEntry {
  jobId: string;
  campaignId: string;
  nodeIds: string[];
}

/* ═══════════════════════════════════════════════════════════
   Panel State (which floating panel is open)
   ═══════════════════════════════════════════════════════════ */

export type ActivePanel = "copilot" | "assets" | "nodeConfig" | "generate" | null;
export type AssetTab = "avatars" | "voices" | "scripts";

/* ═══════════════════════════════════════════════════════════
   Context
   ═══════════════════════════════════════════════════════════ */

interface CanvasContextValue {
  // Canvas state
  state: CanvasState;
  dispatch: Dispatch<CanvasAction>;
  // CoPilot
  copilot: CoPilotState;
  copilotDispatch: Dispatch<CoPilotReducerAction>;
  // Panel management
  activePanel: ActivePanel;
  setActivePanel: (panel: ActivePanel) => void;
  togglePanel: (panel: ActivePanel) => void;
  assetTab: AssetTab;
  setAssetTab: (tab: AssetTab) => void;
  // Convenience
  addNode: (type: WorkflowNodeType, data?: Partial<NodeData>) => void;
  removeNode: (nodeId: string) => void;
  updateNodeData: (nodeId: string, data: Partial<NodeData>) => void;
  selectNode: (nodeId: string | null) => void;
  loadDefaultWorkflow: () => void;
  clearCanvas: () => void;
  getNodeByType: (type: WorkflowNodeType) => WorkflowNode | undefined;
  isWorkflowReady: () => boolean;
  // Job tracking
  trackJob: (jobId: string, campaignId: string, nodeIds: string[]) => void;
  activeJobs: ActiveJobEntry[];
  completedJobs: Job[];
}

const CanvasContext = createContext<CanvasContextValue | null>(null);

export function CanvasProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(canvasReducer, initialState);
  const [copilot, copilotDispatch] = useReducer(copilotReducer, initialCoPilotState);
  const [activePanel, setActivePanel] = useState<ActivePanel>("copilot");
  const [assetTab, setAssetTab] = useState<AssetTab>("avatars");
  const [activeJobs, setActiveJobs] = useState<ActiveJobEntry[]>([]);
  const [completedJobs, setCompletedJobs] = useState<Job[]>([]);

  /* ─── Workflow Persistence ─── */
  useWorkflowPersistence(state, (saved) => {
    dispatch({
      type: "RESTORE_STATE",
      payload: saved,
    });
  });

  /* ─── Job Polling ─── */
  useJobPoller(
    activeJobs,
    (changes) => {
      for (const change of changes) {
        for (const nodeId of change.nodeIds) {
          dispatch({
            type: "UPDATE_NODE_STATUS",
            payload: { nodeId, status: change.nodeStatus },
          });
        }
        // Remove from active jobs if terminal
        if (change.nodeStatus === "complete" || change.nodeStatus === "error") {
          setActiveJobs((prev) => prev.filter((j) => j.jobId !== change.jobId));
        }
      }
    },
    (job) => {
      setCompletedJobs((prev) => [job, ...prev].slice(0, 50));
    }
  );

  const trackJob = useCallback(
    (jobId: string, campaignId: string, nodeIds: string[]) => {
      setActiveJobs((prev) => {
        // Don't add duplicates
        if (prev.some((j) => j.jobId === jobId)) return prev;
        return [...prev, { jobId, campaignId, nodeIds }];
      });
    },
    []
  );

  const togglePanel = useCallback((panel: ActivePanel) => {
    setActivePanel((prev) => (prev === panel ? null : panel));
  }, []);

  const addNode = useCallback(
    (type: WorkflowNodeType, data?: Partial<NodeData>) => {
      dispatch({ type: "ADD_NODE", payload: { nodeType: type, data } });
    },
    []
  );

  const removeNode = useCallback(
    (nodeId: string) => dispatch({ type: "REMOVE_NODE", payload: { nodeId } }),
    []
  );

  const updateNodeData = useCallback(
    (nodeId: string, data: Partial<NodeData>) =>
      dispatch({ type: "UPDATE_NODE_DATA", payload: { nodeId, data } }),
    []
  );

  const selectNode = useCallback(
    (nodeId: string | null) => {
      dispatch({ type: "SELECT_NODE", payload: { nodeId } });
      if (nodeId) setActivePanel("nodeConfig");
    },
    []
  );

  const loadDefaultWorkflow = useCallback(
    () => dispatch({ type: "LOAD_DEFAULT_WORKFLOW" }),
    []
  );

  const clearCanvas = useCallback(
    () => dispatch({ type: "CLEAR_CANVAS" }),
    []
  );

  const getNodeByType = useCallback(
    (type: WorkflowNodeType) => state.nodes.find((n) => n.type === type),
    [state.nodes]
  );

  const isWorkflowReady = useCallback(() => {
    const hasAvatar = state.nodes.some((n) => n.type === "avatar" && n.status === "configured");
    const hasScript = state.nodes.some((n) => {
      if (n.type !== "script") return false;
      if (n.status === "configured") return true;
      // Also consider scripts with generatedContent as ready
      const data = n.data as { generatedContent?: string; content?: string; scriptId?: string };
      return !!(data.generatedContent || data.content || data.scriptId);
    });
    const hasProvider = state.nodes.some((n) => n.type === "provider" && n.status === "configured");
    return hasAvatar && hasScript && hasProvider;
  }, [state.nodes]);

  return (
    <CanvasContext.Provider
      value={{
        state,
        dispatch,
        copilot,
        copilotDispatch,
        activePanel,
        setActivePanel,
        togglePanel,
        assetTab,
        setAssetTab,
        addNode,
        removeNode,
        updateNodeData,
        selectNode,
        loadDefaultWorkflow,
        clearCanvas,
        getNodeByType,
        isWorkflowReady,
        trackJob,
        activeJobs,
        completedJobs,
      }}
    >
      {children}
    </CanvasContext.Provider>
  );
}

export function useCanvas() {
  const ctx = useContext(CanvasContext);
  if (!ctx) throw new Error("useCanvas must be used within CanvasProvider");
  return ctx;
}
