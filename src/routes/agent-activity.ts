import { Router, Request, Response } from "express";
import { agentActivityEmitter } from "../services/agent-orchestrator";

const router = Router();

router.get("/stream", (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const onActivity = (data: Record<string, unknown>) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  agentActivityEmitter.on("activity", onActivity);

  req.on("close", () => {
    agentActivityEmitter.off("activity", onActivity);
  });
});

export default router;
