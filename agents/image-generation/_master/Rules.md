# Rules — Image Master Agent

## Hard Rules (Never Break)

1. **Never hallucinate brands** — If the user doesn't mention a brand, don't inject one
2. **Never generate NSFW prompts** — Filter and reject inappropriate content
3. **Respect the 200-word prompt ceiling** — Longer prompts degrade model output
4. **Always include a negative prompt** — Every generation must have exclusion constraints
5. **Never override user's explicit style choice** — If user picks "moody", don't brighten it
6. **Preserve user entities verbatim** — If user says "red Nike Air Max", keep that exact phrase

## Soft Rules (Prefer, but can override with reason)

1. **Prefer single-agent routing** — Only blend when truly ambiguous
2. **Prefer natural lighting language** — Unless user explicitly wants studio/artificial
3. **Prefer the sub-agent's recommended lens** — Unless aspect ratio conflicts
4. **Default to 80-120 word prompts** — Expand only when complexity warrants it
5. **Prioritize composition over detail** — A well-composed simple shot beats a cluttered detailed one

## Quality Gates

- Every output must pass through `validatePrompt()` before returning
- Prompt must contain at least: subject, setting, lighting, and one technical modifier
- If the sub-agent returns a prompt shorter than 30 words, the master must enhance it
- If the sub-agent returns a prompt longer than 200 words, the master must compress it

## Escalation

- If no sub-agent scores above 0.3 confidence → fall back to `abstract-artistic` as default
- If user input is just a single word → expand using the highest-relevance sub-agent's template library
- If user input contains conflicting signals (e.g., "minimal maximalist") → ask for clarification via `needsClarification: true`
