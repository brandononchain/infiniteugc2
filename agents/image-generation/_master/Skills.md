# Skills — Image Master Agent

## Core Skills

### 1. Intent Parsing
- Extract subject, action, setting, mood, and style from natural language
- Handle ambiguous inputs by inferring from context
- Detect when a user is describing a template vs. freeform creation

### 2. Multi-Agent Routing
- Score each sub-agent's relevance (0-1) against the parsed intent
- Support single-dispatch (confidence >= 0.6) and multi-dispatch blending
- Maintain routing history for session coherence

### 3. Prompt Composition
- Merge sub-agent output with technical parameters
- Layer enhancements: style → lighting → lens → composition → detail
- Enforce token budget (max 200 words, optimal 80-120)

### 4. Style Transfer
- Map abstract style names to concrete photographic language:
  - `photorealistic` → "8K RAW photograph, natural lighting, shallow depth of field, shot on Sony A7IV"
  - `cinematic` → "anamorphic 2.39:1, film grain, Arri Alexa, warm color grading, bokeh"
  - `editorial` → "high fashion editorial, Vogue-style, studio lighting, clean composition"
  - `minimal` → "negative space, single subject, muted palette, geometric framing"
  - `vibrant` → "saturated colors, dynamic composition, energetic, bold contrasts"
  - `moody` → "low key lighting, deep shadows, atmospheric, desaturated, noir"
  - `soft_dreamy` → "soft focus, pastel palette, ethereal glow, gauze diffusion"
  - `raw_authentic` → "candid, unposed, natural imperfections, documentary style"

### 5. Aspect Ratio Intelligence
- 9:16 (Portrait/Story): Emphasize vertical composition, leading lines upward
- 16:9 (Landscape/Banner): Wide establishing shots, rule of thirds horizontal
- 1:1 (Square/Feed): Center-weighted, symmetrical or diagonal composition
- 4:3 (Classic): Balanced framing, traditional photographic composition
- 3:4 (Portrait): Slight vertical emphasis, headroom-aware framing

### 6. Negative Prompt Engineering
- Always append context-aware negative prompts
- Base negatives: "blurry, low quality, watermark, text overlay, distorted, deformed"
- Product shots add: "floating objects, inconsistent shadows, unrealistic reflections"
- People shots add: "extra fingers, distorted faces, unnatural skin"
- Food shots add: "unappetizing, plastic-looking, artificial colors"
