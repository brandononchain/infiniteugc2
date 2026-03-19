# Skills — Storyboard Keyframe Artist

## Script Chunking
Parse any script format into discrete sections that each become one keyframe. Handle multiple formats gracefully — markers, numbering, paragraphs, or sentence grouping. Let the script's natural structure determine the frame count.

- Detect `[HOOK]`, `[STEP 1]`, `[CTA]` style markers
- Detect `1.` `2.` `3.` numbered sections
- Split on paragraph breaks (double newlines)
- Fall back to grouping sentences into chunks of ~15+ words
- Never force a fixed frame count — the script decides

## Consistency Anchor Detection
Read the full script before chunking and extract the visual DNA that must stay consistent across all frames. This is NOT prompt engineering — it's context detection that gets passed to the image pipeline.

- Infer environment from script keywords (kitchen, outdoor, office, etc.)
- Infer character description from mentions of people/creators/hosts
- Infer color palette from mood keywords (luxury → gold/cream, fresh → whites/green)
- These anchors become a prefix prepended to each chunk

## Image Pipeline Orchestration
Feed each chunk through `generateImagePrompt()` with the right options. The image pipeline does all the real work — template matching, style modifiers, camera profiles, entity injection. The storyboard agent just calls it per-chunk with consistency context prepended.

- Always pass `style: "cinematic"` (unless user overrides)
- Always pass `aspectRatio: "16:9"`
- The pipeline's own classification may route each chunk to different sub-agents (one chunk might match product-ugc, another might match lifestyle) — this is fine, the consistency prefix keeps them visually coherent
- Collect all returned ImageGenerationPayloads into the StoryboardPayload
