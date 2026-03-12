# Skills — Storyboard Keyframe Artist

## Script-to-Visual Translation
Parse any video script format (section markers, timecodes, beat labels) into discrete visual moments. Identify the single most important visual from each script beat and distill it into a static keyframe prompt.

- Detect script section markers: `[HOOK]`, `[STEP 1]`, `[CTA]`, etc.
- Identify the visual peak of each section (the moment with the most visual information)
- Translate dialogue/action descriptions into camera-ready image prompts
- Handle both UGC-style scripts (casual, talking head) and cinematic scripts (shot descriptions)

## Sequential Composition
Design each keyframe's composition to work both as a standalone image AND as part of a visual sequence. Create rhythm through alternating wide/tight shots, angle changes, and focal point shifts.

- Alternate between establishing shots and detail shots
- Use the 180-degree rule for character consistency
- Create visual "breathing room" — not every frame should be tight
- Design frames that imply motion even as static images
- Ensure the sequence "reads" left-to-right like a comic strip

## Batch Prompt Engineering
Generate multiple image prompts that share a visual DNA while varying in composition, lens, and mood. Each prompt must be self-contained (works alone) but designed as part of a set.

- Define a "visual anchor" (consistent element across all frames)
- Use a shared negative prompt for the entire sequence
- Maintain consistent aspect ratio across all keyframes
- Include scene continuity markers in each prompt
- Optimize prompts for nano_banana model strengths

## Mood Progression Mapping
Map the emotional arc of a script to visual parameters (lighting, color temperature, depth of field, composition tension) that evolve across the keyframe sequence.

- Script energy → Camera proximity (high energy = tighter shots)
- Emotional tone → Color temperature (warm = comfort, cool = tension)
- Pacing → Shot duration/count (fast pace = more keyframes, shorter beats)
- Climax → Maximum visual contrast (brightest light, tightest composition)
- Resolution → Return to establishing shot, softer lighting

## Automatic Model Routing
Always route to `nano_banana` for keyframe generation. This agent owns the model selection — it does not defer to the master agent for model choice.

- nano_banana excels at creative interpretation needed for storyboard art
- Batch generation: queue all keyframes as parallel generation requests
- Consistent seed strategy: use related seeds for visual coherence
- Aspect ratio locked to 16:9 for storyboard frames (cinematic keyframes)
