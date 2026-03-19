# Video Cloner — Architectural Workflow Schematic

> **Version:** 1.0
> **Date:** 2026-03-17
> **Status:** Spec / Reference

---

## 1. System Overview

The Video Cloner is a scene-level video regeneration pipeline that takes a source
UGC video, analyzes its scene structure, generates a product-swap plan, and
rebuilds the video using a mix of AI video generation models — while preserving
the original pacing, energy, and storytelling arc.

```
                         ┌──────────────────────────────────────┐
                         │           CLIENT (Web / API)          │
                         └───────────────┬──────────────────────┘
                                         │
                         POST /clone/advanced   (50 credits)
                         POST /clone/analyze-scenes  (dry-run)
                         POST /clone/swap-preview    (dry-run)
                                         │
                         ┌───────────────▼──────────────────────┐
                         │         clone.ts  (Hono Router)       │
                         │  Auth → Credit Check → Job Creation   │
                         └───────────────┬──────────────────────┘
                                         │
                              Creates row in `clone_jobs`
                              Fires background pipeline ──────▶  processAdvancedCloneGeneration()
                                         │
                         ┌───────────────▼──────────────────────┐
                         │    video-cloner-pipeline.ts           │
                         │    (Orchestrator — 6 Steps)           │
                         └──────────────────────────────────────┘
```

---

## 2. Pipeline Stages (Detailed Flow)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      processAdvancedCloneGeneration()                       │
│                                                                             │
│  Input:  cloneJobId, userId, ClonerJobConfig                                │
│  Config: { userProduct, newScript?, avatarImageUrl?, voiceId?,              │
│            cloneVoiceFromSource?, preferredModel?, aspectRatio? }           │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  STEP 1 — SCENE ANALYSIS                  status: analyzing_scenes   │  │
│  │                                                                       │  │
│  │  scene-analyzer.ts ──▶ Gemini 2.5 Flash (video understanding)        │  │
│  │                                                                       │  │
│  │  Input:  source_video_url                                             │  │
│  │  Output: SceneAnalysisResult                                          │  │
│  │    ├── totalDuration, aspectRatio, sceneCount                         │  │
│  │    ├── scenes[] ── each SceneSegment:                                 │  │
│  │    │     type: talking_head | broll | product_shot | transition        │  │
│  │    │     timing: startSeconds, endSeconds, durationSeconds            │  │
│  │    │     content: description, cameraWork, lighting, dialogue         │  │
│  │    │     products[]: name, position, visibleFeatures                  │  │
│  │    │     swap: isSwappable, swapDifficulty, swapNotes                 │  │
│  │    ├── overallStyle, speakerProfile, hookStrategy                     │  │
│  │    ├── scriptFull (transcribed dialogue)                              │  │
│  │    └── productSummary                                                 │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                   │                                         │
│                                   ▼                                         │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  STEP 2 — PRODUCT SWAP PLANNING            status: planning_swap     │  │
│  │                                                                       │  │
│  │  product-swap.ts ──▶ LLM Planning (GPT-4o / Claude)                  │  │
│  │                                                                       │  │
│  │  Input:  SceneSegment[], UserProduct, originalScript, newScript?      │  │
│  │  Output: ProductSwapPlan                                              │  │
│  │    ├── totalScenes, scenesToRegenerate, scenesToKeep                  │  │
│  │    ├── estimatedDurationSeconds                                       │  │
│  │    ├── newScript (rewritten with product swap)                        │  │
│  │    └── scenePrompts[] ── each SceneSwapPrompt:                       │  │
│  │          ├── sceneIndex, sceneType, timing                            │  │
│  │          ├── strategy: sora2pro | kling_mc | veo3 | keep_original    │  │
│  │          ├── prompt (generation prompt)                                │  │
│  │          ├── motionReference, referenceFrameTimestamp                  │  │
│  │          ├── avatarSwap: boolean                                       │  │
│  │          ├── lipSync: boolean                                          │  │
│  │          └── dialogueText (if lip-synced)                             │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                   │                                         │
│                                   ▼                                         │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  STEP 3 — SEGMENT EXTRACTION             status: extracting_segments │  │
│  │                                                                       │  │
│  │  video-stitcher.ts (FFmpeg)                                           │  │
│  │                                                                       │  │
│  │  3a. downloadVideoBuffer(sourceVideoUrl) ──▶ Buffer                  │  │
│  │  3b. getVideoMetadata(buffer) ──▶ { duration, width, height, fps }   │  │
│  │  3c. Voice resolution:                                                │  │
│  │      ├── config.voiceId        ──▶ lookup in `voices` table          │  │
│  │      └── cloneVoiceFromSource  ──▶ extractAudio → cloneVoice()       │  │
│  │          (ElevenLabs) ──▶ resolvedVoiceId                            │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                   │                                         │
│                                   ▼                                         │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  STEP 4 — SCENE REGENERATION          status: regenerating_scenes    │  │
│  │                                                                       │  │
│  │  For each SceneSwapPrompt (sequential):                               │  │
│  │                                                                       │  │
│  │  ┌─────────────────┐   ┌──────────────────────────────────────────┐  │  │
│  │  │ keep_original    │──▶│ extractSegment(buffer, start, end)       │  │  │
│  │  └─────────────────┘   └──────────────────────────────────────────┘  │  │
│  │                                                                       │  │
│  │  ┌─────────────────┐   ┌──────────────────────────────────────────┐  │  │
│  │  │ sora2pro         │──▶│ extractFrameAtTime() → referenceFrame    │  │  │
│  │  │ (B-roll / prod)  │   │ kie-sora2pro.ts → Kie.ai Sora2Pro API  │  │  │
│  │  │                  │   │   generateSora2ProChunk()                │  │  │
│  │  │                  │   │   pollTaskCompletion()                   │  │  │
│  │  │                  │   │   downloadSora2ProResult()               │  │  │
│  │  └─────────────────┘   └──────────────────────────────────────────┘  │  │
│  │                                                                       │  │
│  │  ┌─────────────────┐   ┌──────────────────────────────────────────┐  │  │
│  │  │ veo3             │──▶│ extractFrameAtTime() → referenceFrame    │  │  │
│  │  │ (B-roll / prod)  │   │ veo3.ts → Kie.ai VEO 3.1 API           │  │  │
│  │  │                  │   │   generate() + poll()                    │  │  │
│  │  └─────────────────┘   └──────────────────────────────────────────┘  │  │
│  │                                                                       │  │
│  │  ┌─────────────────┐   ┌──────────────────────────────────────────┐  │  │
│  │  │ kling_mc         │──▶│ extractSegment() → sourceSegment         │  │  │
│  │  │ (Talking head)   │   │ Kling Motion-Clone API                  │  │  │
│  │  │                  │   │   avatarImageUrl + motion ref            │  │  │
│  │  │                  │   │   + optional lip-sync (ElevenLabs TTS)   │  │  │
│  │  │                  │   │ Sync Labs (lip-sync overlay)             │  │  │
│  │  │                  │   │   createSyncGeneration()                 │  │  │
│  │  │                  │   │   pollSyncCompletion()                   │  │  │
│  │  └─────────────────┘   └──────────────────────────────────────────┘  │  │
│  │                                                                       │  │
│  │  FALLBACK: On any scene failure → extractSegment(original)           │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                   │                                         │
│                                   ▼                                         │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  STEP 5 — VIDEO STITCHING                    status: stitching       │  │
│  │                                                                       │  │
│  │  video-stitcher.ts                                                    │  │
│  │    sort scenes by sceneIndex                                          │  │
│  │    stitchVideos(buffers[], targetWidth, targetHeight, targetFps)      │  │
│  │    ──▶ stitchedVideo: Buffer                                          │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                   │                                         │
│                                   ▼                                         │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  STEP 6 — UPLOAD & COMPLETE                 status: completed        │  │
│  │                                                                       │  │
│  │  Supabase Storage: videos/{userId}/{cloneJobId}/cloned.mp4           │  │
│  │  Update clone_jobs row:                                               │  │
│  │    cloned_video_url, completed_at, clone_blueprint                   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ON FAILURE:                                                                │
│    status → failed, error_message saved                                    │
│    Credits refunded to profiles.credits                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Strategy Selection Matrix

The swap planner assigns a generation strategy per scene based on scene type
and content:

| Scene Type       | Default Strategy | Trigger Condition                                    |
|------------------|------------------|------------------------------------------------------|
| `talking_head`   | `kling_mc`       | Avatar image provided; uses motion-clone + lip-sync  |
| `talking_head`   | `keep_original`  | No avatar image → preserve original speaker          |
| `broll`          | `sora2pro`       | Default for B-roll regeneration                      |
| `product_shot`   | `sora2pro`       | Product visible, needs swap with new product          |
| `product_shot`   | `veo3`           | If `preferredModel` = `"veo3"`                       |
| `transition`     | `keep_original`  | Short transitions are kept as-is                     |
| Any scene        | `keep_original`  | `isSwappable = false` or `swapDifficulty` too high   |

---

## 4. External Service Dependency Map

```
┌─────────────────────────────────────────────────────────────────┐
│                     VIDEO CLONER PIPELINE                        │
│                                                                  │
│  ┌────────────┐    ┌─────────────┐    ┌──────────────────────┐  │
│  │ Gemini 2.5 │    │   LLM       │    │   Supabase           │  │
│  │ Flash      │    │ (Planner)   │    │   ├── DB (clone_jobs) │  │
│  │            │    │             │    │   ├── DB (profiles)   │  │
│  │ Scene      │    │ Swap plan   │    │   ├── DB (voices)     │  │
│  │ Analysis   │    │ generation  │    │   └── Storage (videos)│  │
│  └────────────┘    └─────────────┘    └──────────────────────┘  │
│                                                                  │
│  ┌────────────┐    ┌─────────────┐    ┌──────────────────────┐  │
│  │ Kie.ai     │    │ Kling AI    │    │   ElevenLabs         │  │
│  │ ├── Sora2  │    │ Motion-     │    │   ├── generateAudio() │  │
│  │ │   Pro API │    │ Clone API   │    │   ├── cloneVoice()   │  │
│  │ └── VEO    │    │             │    │   └── remixVoice()   │  │
│  │     3.1 API│    │ Talking-    │    │                       │  │
│  │            │    │ head regen  │    │   Voice cloning &     │  │
│  │ B-roll &   │    │ + avatar    │    │   TTS for lip-sync   │  │
│  │ product    │    │   swap      │    │                       │  │
│  │ shots      │    │             │    │                       │  │
│  └────────────┘    └─────────────┘    └──────────────────────┘  │
│                                                                  │
│  ┌────────────┐    ┌─────────────┐                               │
│  │ Sync Labs  │    │ FFmpeg      │                               │
│  │            │    │ (local)     │                               │
│  │ Lip-sync   │    │             │                               │
│  │ overlay    │    │ extract,    │                               │
│  │ on kling   │    │ stitch,     │                               │
│  │ output     │    │ metadata    │                               │
│  └────────────┘    └─────────────┘                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. API Surface

### 5a. Full Pipeline Endpoints

| Method | Path                    | Credits | Description                           |
|--------|-------------------------|---------|---------------------------------------|
| POST   | `/clone/advanced`       | 50      | Full product-swap clone pipeline      |
| POST   | `/clone/generate`       | 25      | Simple clone from existing job        |
| POST   | `/clone/generate-url`   | 25      | Simple clone from raw URL             |
| GET    | `/clone`                | 0       | List user's clone jobs                |
| GET    | `/clone/:id`            | 0       | Get single clone job status/result    |

### 5b. Dry-Run / Preview Endpoints (No Credits)

| Method | Path                      | Description                            |
|--------|---------------------------|----------------------------------------|
| POST   | `/clone/preview`          | Dry-run analysis (legacy)              |
| POST   | `/clone/analyze-scenes`   | Scene analysis only                    |
| POST   | `/clone/swap-preview`     | Scene analysis + swap plan (no regen)  |

---

## 6. Job State Machine

```
                    ┌──────────┐
                    │ pending  │
                    └────┬─────┘
                         │
                    ┌────▼────────────┐
                    │analyzing_scenes │
                    └────┬────────────┘
                         │
                    ┌────▼────────────┐
                    │ planning_swap   │
                    └────┬────────────┘
                         │
                    ┌────▼──────────────────┐
                    │ extracting_segments   │
                    └────┬─────────────────┘
                         │
                    ┌────▼──────────────────┐
                    │ regenerating_scenes   │  ← progress: "scene N/M (strategy)"
                    └────┬─────────────────┘
                         │
                    ┌────▼────────┐
                    │ stitching   │
                    └────┬────────┘
                         │
                ┌────────▼────────┐
                │   completed     │
                │  cloned_video_  │
                │  url set        │
                └─────────────────┘

  Any step ──error──▶  ┌────────┐
                       │ failed │  credits refunded
                       └────────┘
```

---

## 7. Data Model (clone_jobs table)

| Column              | Type      | Description                                    |
|---------------------|-----------|------------------------------------------------|
| `id`                | uuid      | Primary key                                    |
| `user_id`           | uuid      | FK → profiles                                  |
| `source_video_url`  | text      | Original video URL                             |
| `status`            | text      | Current pipeline stage (see state machine)     |
| `scene_analysis`    | jsonb     | Full SceneAnalysisResult                       |
| `swap_plan`         | jsonb     | Full ProductSwapPlan                           |
| `clone_prompt`      | text      | Rewritten script                               |
| `cloned_video_url`  | text      | Final output URL (on completion)               |
| `clone_blueprint`   | jsonb     | Summary: counts, per-scene strategy used       |
| `pipeline_progress` | text      | Human-readable progress string                 |
| `credits_cost`      | integer   | Credits charged (for refund on failure)         |
| `error_message`     | text      | Error details (on failure)                     |
| `completed_at`      | timestamp | Completion timestamp                           |

---

## 8. Key File Map

```
src/
├── routes/
│   └── clone.ts                    # API routes, validation, credit deduction
├── services/
│   ├── video-cloner-pipeline.ts    # Orchestrator (6-step pipeline)
│   ├── scene-analyzer.ts           # Gemini 2.5 Flash scene understanding
│   ├── product-swap.ts             # LLM-powered swap plan generation
│   ├── video-stitcher.ts           # FFmpeg: extract, stitch, metadata
│   ├── kie-sora2pro.ts             # Kie.ai Sora2Pro video generation
│   ├── veo3.ts                     # Kie.ai VEO 3.1 video generation
│   ├── sync.ts                     # Sync Labs lip-sync API
│   ├── elevenlabs.ts               # Voice cloning & TTS
│   └── clone-pipeline.ts           # Legacy simple clone pipeline
└── lib/
    ├── keys.ts                     # API key management & rotation
    ├── supabase.ts                 # Supabase admin client
    └── fetch.ts                    # fetchWithTimeout utility
```

---

## 9. Sequence Diagram (Happy Path)

```
Client          Router           Pipeline         Gemini       LLM       Kie/Kling     ElevenLabs    Sync Labs    FFmpeg      Supabase
  │                │                │                │           │            │              │            │           │            │
  │ POST /advanced │                │                │           │            │              │            │           │            │
  │───────────────▶│                │                │           │            │              │            │           │            │
  │                │ create job     │                │           │            │              │            │           │            │
  │                │────────────────────────────────────────────────────────────────────────────────────────────────▶│            │
  │                │                │                │           │            │              │            │           │   INSERT   │
  │ { job_id }     │                │                │           │            │              │            │           │            │
  │◀───────────────│                │                │           │            │              │            │           │            │
  │                │ fire & forget  │                │           │            │              │            │           │            │
  │                │───────────────▶│                │           │            │              │            │           │            │
  │                │                │ analyzeScenes  │           │            │              │            │           │            │
  │                │                │───────────────▶│           │            │              │            │           │            │
  │                │                │  scenes[]      │           │            │              │            │           │            │
  │                │                │◀───────────────│           │            │              │            │           │            │
  │                │                │ swapPlan       │           │            │              │            │           │            │
  │                │                │──────────────────────────▶│            │              │            │           │            │
  │                │                │ scenePrompts[] │           │            │              │            │           │            │
  │                │                │◀──────────────────────────│            │              │            │           │            │
  │                │                │ downloadVideo  │           │            │              │            │           │            │
  │                │                │──────────────────────────────────────────────────────────────────▶│            │            │
  │                │                │ sourceBuffer   │           │            │              │            │           │            │
  │                │                │◀──────────────────────────────────────────────────────────────────│            │            │
  │                │                │                │           │            │              │            │           │            │
  │                │                │ [optional] cloneVoice     │            │              │            │           │            │
  │                │                │──────────────────────────────────────────────────────▶│            │           │            │
  │                │                │ voiceId        │           │            │              │            │           │            │
  │                │                │◀──────────────────────────────────────────────────────│            │           │            │
  │                │                │                │           │            │              │            │           │            │
  │                │                │ ── per scene loop ──      │            │              │            │           │            │
  │                │                │ generate(sora2pro/veo3)   │            │              │            │           │            │
  │                │                │──────────────────────────────────────▶│              │            │           │            │
  │                │                │ videoBuffer    │           │            │              │            │           │            │
  │                │                │◀──────────────────────────────────────│              │            │           │            │
  │                │                │   — OR —       │           │            │              │            │           │            │
  │                │                │ generate(kling_mc) + sync │            │              │            │           │            │
  │                │                │──────────────────────────────────────▶│              │            │           │            │
  │                │                │──────────────────────────────────────────────────────────────────▶│           │            │
  │                │                │ lip-synced buf │           │            │              │            │           │            │
  │                │                │◀──────────────────────────────────────────────────────────────────│           │            │
  │                │                │ ── end loop ──            │            │              │            │           │            │
  │                │                │                │           │            │              │            │           │            │
  │                │                │ stitchVideos   │           │            │              │            │           │            │
  │                │                │──────────────────────────────────────────────────────────────────────────────▶│            │
  │                │                │ finalBuffer    │           │            │              │            │           │            │
  │                │                │◀──────────────────────────────────────────────────────────────────────────────│            │
  │                │                │ upload + complete          │            │              │            │           │            │
  │                │                │────────────────────────────────────────────────────────────────────────────────────────────▶│
  │                │                │                │           │            │              │            │           │            │
  │ GET /clone/:id │                │                │           │            │              │            │           │            │
  │───────────────▶│ poll for status│                │           │            │              │            │           │            │
  │ { status, url }│                │                │           │            │              │            │           │            │
  │◀───────────────│                │                │           │            │              │            │           │            │
```

---

## 10. Design Principles

1. **Scene-level granularity** — Decisions happen per-scene, not per-video.
   The planner can mix strategies (keep some scenes, regenerate others).

2. **Graceful degradation** — If any single scene fails to regenerate, the
   pipeline falls back to the original segment rather than failing the job.

3. **Credit safety** — Credits are deducted up-front but fully refunded on
   pipeline failure. No partial charges.

4. **Fire-and-forget with polling** — The API returns immediately with a
   `clone_job_id`. Clients poll `GET /clone/:id` for status updates. The
   `pipeline_progress` field gives human-readable scene-by-scene progress.

5. **Model flexibility** — The swap planner assigns per-scene strategies.
   The `preferredModel` config biases toward a model but the planner
   retains final authority based on scene type.

6. **Dry-run first** — `/analyze-scenes` and `/swap-preview` let users
   inspect the plan before committing credits to a full run.
