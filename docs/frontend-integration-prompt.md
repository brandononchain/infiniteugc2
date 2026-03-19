# Video Cloner — Frontend Integration Prompt

> **Copy-paste this into your Claude Code session on `infinite-uab/infinite-ugc`.**

---

## Task

Wire up the frontend to the backend's Video Cloner API. The backend is fully built and deployed. Your job is to create the frontend pages, API client functions, and UI components that let users:

1. **Analyze** a source video (dry-run, free)
2. **Preview** the swap plan (dry-run, free)
3. **Launch** an advanced clone job (costs 50 credits)
4. **Poll** job status and display the final cloned video

---

## Backend API Contract

Base URL: the existing API base URL already configured in the project (look for `API_URL`, `NEXT_PUBLIC_API_URL`, `apiClient`, or similar).

All endpoints require the existing auth header (Bearer token / Supabase session).

### Endpoints

#### 1. Scene Analysis (Free Dry-Run)

```
POST /clone/analyze-scenes
Content-Type: application/json

Request:
{
  "source_video_url": string  // URL of the video to analyze
}

Response 200:
{
  "source_video_url": string,
  "analysis_time_ms": number,
  "total_duration": number,
  "aspect_ratio": string,
  "scene_count": number,
  "scenes": [{
    "index": number,
    "type": "talking_head" | "broll" | "product_shot" | "transition",
    "start": number,
    "end": number,
    "duration": number,
    "description": string,
    "dialogue": string | null,
    "products": [{ "name": string, "description": string, "position": string, "visibleFeatures": string[], "interactionType": string }],
    "is_swappable": boolean,
    "swap_difficulty": string,
    "swap_notes": string,
    "energy": string
  }],
  "overall_style": string,
  "speaker_profile": string,
  "product_summary": string,
  "script_full": string,
  "hook_strategy": string,
  "target_platform": string
}
```

#### 2. Swap Preview (Free Dry-Run)

```
POST /clone/swap-preview
Content-Type: application/json

Request:
{
  "source_video_url": string,          // required
  "product_name": string,              // required, 1-200 chars
  "product_description": string,       // required, 5-2000 chars
  "product_image_url"?: string,        // optional, valid URL
  "product_brand"?: string,            // optional, max 200
  "product_category"?: string,         // optional, max 100
  "new_script"?: string                // optional, max 10000
}

Response 200:
{
  "source_video_url": string,
  "timing": {
    "analysis_ms": number,
    "swap_planning_ms": number,
    "total_ms": number
  },
  "scene_analysis": {
    "total_duration": number,
    "scene_count": number,
    "aspect_ratio": string,
    "script": string,
    "product_summary": string
  },
  "swap_plan": {
    "new_script": string,
    "scenes_to_regenerate": number,
    "scenes_to_keep": number,
    "estimated_duration": number,
    "scene_prompts": [{
      "scene_index": number,
      "scene_type": string,
      "strategy": "sora2pro" | "kling_mc" | "veo3" | "keep_original",
      "duration": number,
      "avatar_swap": boolean,
      "lip_sync": boolean,
      "motion_reference": string | null,
      "prompt_preview": string,       // truncated to 200 chars
      "notes": string
    }]
  },
  "estimated_credits": 50
}
```

#### 3. Launch Advanced Clone (50 Credits)

```
POST /clone/advanced
Content-Type: application/json

Request:
{
  "source_video_url": string,          // required
  "product_name": string,              // required
  "product_description": string,       // required
  "product_image_url"?: string,        // optional
  "product_brand"?: string,            // optional
  "product_category"?: string,         // optional
  "new_script"?: string,               // optional
  "avatar_image_url"?: string,         // optional — face swap for talking heads
  "voice_id"?: string (uuid),          // optional — existing voice ID
  "clone_voice_from_source"?: boolean, // optional, default false
  "preferred_model"?: "sora2pro" | "veo3",  // default "sora2pro"
  "aspect_ratio"?: "9:16" | "16:9"    // optional
}

Response 200:
{
  "clone_job_id": string (uuid),
  "credits_remaining": number,
  "message": string,
  "mode": "advanced"
}

Response 402: { "error": "Insufficient credits. Need 50, have N" }
```

#### 4. Poll Job Status

```
GET /clone/:id

Response 200 (in progress):
{
  "id": string,
  "status": "pending" | "analyzing_scenes" | "planning_swap" | "extracting_segments" | "regenerating_scenes" | "stitching",
  "pipeline_progress": string | null,  // e.g. "Regenerating scene 3/5 (sora2pro)"
  "scene_analysis": object | null,
  "swap_plan": object | null,
  "created_at": string,
  ...
}

Response 200 (completed):
{
  "id": string,
  "status": "completed",
  "cloned_video_url": string,         // final output video URL
  "clone_blueprint": {
    "totalScenes": number,
    "regenerated": number,
    "kept": number,
    "sceneSummary": ["scene_0:sora2pro", "scene_1:keep_original", ...]
  },
  "completed_at": string,
  ...
}

Response 200 (failed):
{
  "id": string,
  "status": "failed",
  "error_message": string,
  ...
}
```

#### 5. List Clone Jobs

```
GET /clone?page=1&limit=50

Response 200:
{
  "clone_jobs": [...],
  "total": number,
  "page": number,
  "limit": number
}
```

#### 6. Simple Clone (25 Credits) — existing endpoints if needed

```
POST /clone/generate-url
{ "source_video_url": string, "user_prompt": string }
→ { "clone_job_id": string, "credits_remaining": number, "message": string }
```

---

## UI Flow to Build

### Step-by-step wizard (single page or multi-step form):

**Step 1: Source Video**
- URL input field for the source video URL
- "Analyze" button → calls `POST /clone/analyze-scenes`
- Show video preview (embed the URL) + scene breakdown table:
  - Scene index, type badge (talking_head/broll/product_shot/transition), duration, swappable status, description

**Step 2: Product Info**
- Product name (text input, required)
- Product description (textarea, required)
- Product image URL (optional URL input)
- Brand name (optional)
- Category (optional dropdown or text)
- Custom script override (optional textarea — "leave blank to auto-generate")
- "Preview Swap Plan" button → calls `POST /clone/swap-preview`
- Show swap plan summary:
  - New script (expandable)
  - Per-scene strategy table: scene index, type, strategy badge (color-coded), duration, avatar_swap, lip_sync
  - Stats: N scenes to regenerate, N to keep, estimated cost: 50 credits

**Step 3: Advanced Options**
- Avatar image URL (optional — enables face swap on talking-head scenes)
- Voice selection: dropdown of user's existing voices OR checkbox "Clone voice from source video"
- Preferred model: radio/toggle between "Sora2Pro" and "VEO3"
- Aspect ratio: radio 9:16 / 16:9

**Step 4: Launch**
- Summary card showing everything
- Credit cost: 50 credits
- "Start Cloning" button → calls `POST /clone/advanced`
- Redirect to job status page

### Job Status Page (`/clone/[id]`):

- Poll `GET /clone/:id` every 5 seconds while status is not `completed` or `failed`
- Show a progress stepper with these stages:
  1. Analyzing Scenes
  2. Planning Swap
  3. Extracting Segments
  4. Regenerating Scenes ← show `pipeline_progress` text here (e.g. "Scene 3/5 (sora2pro)")
  5. Stitching
  6. Complete
- On `completed`: stop polling, show the cloned video player (use `cloned_video_url`) + download button + clone_blueprint summary
- On `failed`: show error_message, note that credits were refunded

### Clone Jobs List Page (`/clone`):

- Table/grid of past clone jobs from `GET /clone`
- Columns: campaign name, status badge, created date, source video thumbnail, cloned video link
- Click row → navigate to job status page

---

## Implementation Notes

- Follow the project's existing patterns for API calls, state management, and component structure
- Use the existing auth/session handling — don't create new auth logic
- Use the existing UI component library (shadcn, radix, etc.) — check what's already installed
- Poll with `setInterval` or `useEffect` + cleanup, not with SWR/React Query `refetchInterval` unless the project already uses that pattern
- The scene analysis and swap preview can take 30-60 seconds — show loading spinners with descriptive text
- The full pipeline can take 5-15 minutes — make sure the polling UX handles long waits gracefully
- Strategy badges should be color-coded:
  - `sora2pro` → blue
  - `veo3` → purple
  - `kling_mc` → green
  - `keep_original` → gray
- Scene type badges:
  - `talking_head` → orange
  - `broll` → blue
  - `product_shot` → pink
  - `transition` → gray

---

## Architecture Reference

See the full backend architecture schematic at:
`backend/docs/video-cloner-architecture.md`

Key things to know:
- The pipeline is **fire-and-forget** — `POST /clone/advanced` returns immediately, the pipeline runs async
- Credits are **refunded on failure** — the user doesn't lose credits if the pipeline crashes
- Scene types determine regeneration strategy — `talking_head` → Kling Motion-Clone, `broll`/`product_shot` → Sora2Pro or VEO3, `transition` → keep original
- The `pipeline_progress` field updates during scene regeneration with per-scene status
