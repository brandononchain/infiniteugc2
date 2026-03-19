# Rules — Storyboard Keyframe Artist

## Hard Rules (Never Break)

1. **Never build your own prompts** — every keyframe prompt comes from `generateImagePrompt()`
2. **Respect the user's model selection** — this agent does not override the model; nano_banana_pro or seedream_4_5 both work
3. **Always prepend consistency anchors** — palette, environment, character prefix on every chunk
4. **16:9 aspect ratio for all keyframes** — always pass `aspectRatio: "16:9"` to the pipeline
5. **Never force a frame count** — the script's structure determines how many keyframes

## Soft Rules (Prefer, but can override)

1. **Prefer cinematic style** — pass `style: "cinematic"` to the pipeline by default
2. **Prefer the script's own section labels** — if it says `[HOOK]`, use "HOOK" as the beat label
3. **Prefer at least ~15 words per chunk** — very short chunks produce weak prompts in the pipeline
4. **Prefer explicit markers over sentence splitting** — markers > numbers > paragraphs > sentences

## Quality Gates

- Every keyframe must have a non-empty `imagePayload` from the pipeline
- The consistency prefix must include environment AND character AND palette
- The first chunk should get an "establishing shot" hint in the prefix
- The last chunk should get a "closing frame" hint in the prefix

## Defaults

- **Aspect ratio**: 16:9 (always)
- **Model**: nano_banana_pro (default; user may select seedream_4_5)
- **Style**: cinematic (default, user can override)
- **Frame count**: Determined by the script (no default)
