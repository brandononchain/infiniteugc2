# Rules — Video Master Agent

## Hard Rules (Never Break)

1. **Every video must have a hook** — No video starts without an attention-grabber
2. **Match provider to content** — Never route avatar content to sora2, never route cinematic to hedra_avatar
3. **Respect platform constraints** — 9:16 for short-form, 16:9 for long-form, never mismatch
4. **Never exceed duration limits** — Short scripts for short videos, don't overcram
5. **Always include caption styling** — 80%+ of social video is watched muted
6. **Preserve user's brand voice** — If user specifies tone, every sub-agent must respect it

## Soft Rules (Prefer)

1. **Prefer single-take for UGC** — Multiple cuts feel less authentic for UGC style
2. **Prefer talking head for testimonials** — Avatar with speech is most convincing
3. **Prefer dynamic cuts for trend content** — Fast pacing matches trend energy
4. **Default to 30 seconds** — The sweet spot for most platforms
5. **Default to energetic tone** — Unless user specifies otherwise

## Quality Gates

- Script must have clear HOOK / BODY / CTA sections
- Hook must be deliverable in under 3 seconds
- CTA must include a specific action (not just "check it out")
- If script word count > duration allows, compress before sending
- Provider must support the requested aspect ratio

## Escalation

- If no sub-agent scores above 0.3 → default to `ugc-ad` (most versatile)
- If user request is just a product name → expand using `ugc-ad` with product-focused template
- If conflicting signals → ask for clarification via `needsClarification: true`
