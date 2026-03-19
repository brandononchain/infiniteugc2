// Polyfill File for OpenAI SDK on Node < 20
import { File as NodeFile } from "node:buffer";
if (typeof globalThis.File === "undefined") {
  (globalThis as any).File = NodeFile;
}

import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env";
import campaignsRouter from "./routes/campaigns";
import jobsRouter from "./routes/jobs";
import voicesRouter from "./routes/voices";
import videoRouter from "./routes/video";
import premiumJobsRouter from "./routes/premium-jobs";
import premiumVideoRouter from "./routes/premium-video";
import testCaptionsRouter from "./routes/test-captions";
import imageGenerationRouter from "./routes/image-generation";
import massCampaignsRouter from "./routes/mass-campaigns";
import hooksRouter from "./routes/hooks";
import brollRouter from "./routes/broll";
import motionControlRouter from "./routes/motion-control";
import syncRouter from "./routes/sync";
import dubbingRouter from "./routes/dubbing";
import adminRouter from "./routes/admin";
import transcriptionRouter from "./routes/transcription";
import agentActivityRouter from "./routes/agent-activity";
import cloneRouter from "./routes/clone";
import { startQueuePoller } from "./services/queue-poller";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.corsOrigins.length ? env.corsOrigins : env.corsOrigin,
    credentials: true,
  })
);
app.use(express.json({ limit: "50mb" }));

app.get("/", (_req, res) => {
  res.json({ status: "ok", message: "Backend is running", timestamp: new Date().toISOString() });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/campaigns", campaignsRouter);
app.use("/jobs", jobsRouter);
app.use("/voices", voicesRouter);
app.use("/video", videoRouter);
app.use("/premium-jobs", premiumJobsRouter);
app.use("/video", premiumVideoRouter);
app.use("/api", testCaptionsRouter);
app.use("/image-generation", imageGenerationRouter);
app.use("/mass-campaigns", massCampaignsRouter);
app.use("/hooks", hooksRouter);
app.use("/broll", brollRouter);
app.use("/motion-control", motionControlRouter);
app.use("/sync", syncRouter);
app.use("/dubbing", dubbingRouter);
app.use("/admin", adminRouter);
app.use("/transcription", transcriptionRouter);
app.use("/agent-activity", agentActivityRouter);
app.use("/clone", cloneRouter);

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
);

// Only listen when running directly (not on Vercel)
if (!process.env.VERCEL) {
  app.listen(env.port, () => {
    console.log(`Backend server listening on port ${env.port}`);

    // Start the queue poller — picks up stuck/queued jobs and auto-fails stale ones
    startQueuePoller();
  });
}

// Export for Vercel serverless
export default app;