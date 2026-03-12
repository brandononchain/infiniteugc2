# Rules — Storyboard Keyframe Artist

## Hard Rules (Never Break)

1. **Always generate at least 3 keyframes** — A storyboard with fewer than 3 frames is not a storyboard
2. **Never exceed 8 keyframes** — More than 8 becomes unwieldy and loses focus
3. **Always use nano_banana model** — This agent owns its model selection, always nano_banana
4. **Maintain character consistency** — Same person description across all frames, verbatim
5. **Lock the color palette** — Define in frame 1, reference in all subsequent frames
6. **Every keyframe gets a beat label** — e.g., "HOOK", "STEP 1", "CTA" matching the script
7. **16:9 aspect ratio for all keyframes** — Storyboard frames are always cinematic widescreen

## Soft Rules (Prefer, but can override)

1. **Prefer alternating shot scales** — Wide, Medium, Close, Medium, Wide creates rhythm
2. **Prefer natural light progression** — If the story has a time element, evolve the lighting
3. **Prefer the rule of thirds** — But break it intentionally for emotional emphasis frames
4. **Prefer showing hands/objects over full faces** — nano_banana handles objects better than precise faces
5. **Prefer environmental storytelling** — Show the world, not just the subject
6. **Prefer 5-6 keyframes** — Enough to tell the story, not so many it overwhelms

## Quality Gates

- Every keyframe prompt must contain: subject, environment, lighting, camera angle, and mood
- The first keyframe must establish the scene (wide shot or medium-wide)
- The last keyframe must provide visual closure (return to establishing or clean end frame)
- No two consecutive keyframes should use the same focal length
- The sequence must have at least one "detail/close-up" frame
- Total prompt words across all keyframes should not exceed 1200 (avg ~150-200 per frame)

## Defaults

- **Keyframe count**: 5 (unless script clearly demands more or fewer)
- **Aspect ratio**: 16:9 (always)
- **Model**: nano_banana (always)
- **Style**: Cinematic illustration with photographic grounding
- **Palette**: Derived from the script's dominant mood — warm for positive, cool for dramatic
- **First frame**: Wide establishing shot, 24mm equivalent
- **Last frame**: Clean resolution shot or brand lockup frame
