# Lessons Learned

## 2026-03-06: Luma UI Polish
- **Don't vibe-code**: Dot grids, radial gradients, decorative glow lines = tacky. Real Luma is CLEAN — pure dark surfaces, almost invisible borders (white/[0.06]), no decoration.
- **Match the reference layout**: Luma has a two-row prompt bar (textarea top, icons bottom), not a single-row pill. Study the reference image structure before coding.
- **Port ALL buttons from reference UI**: When adapting from a light-theme reference, extract every button/function/control, then re-skin for the dark theme. Don't simplify or skip fields (char counts, -/+ steppers, reset links, subtitles).
- **Glass = subtle**: Real glassmorphism is `bg-[#0D0D0D]/90 backdrop-blur-2xl border border-white/[0.07]`, NOT `bg-[#111]/70 border border-[#1A1A1A]`. The white/[0.0x] border system reads cleaner than fixed hex borders.
- **Studio feel > AI aesthetic**: Linear, minimal, lots of breathing room. When in doubt, remove visual noise.

## 2026-03-06: Overflow / Clipping Bug
- **NEVER use `overflow-hidden` on containers that have child dropdowns.** Absolute-positioned children (like dropdown menus using `bottom-full` or `bottom-[calc(100%+Xpx)]`) get clipped by `overflow-hidden` ancestors. The dropdown renders inside the container instead of floating above it.
- **Fix**: Remove `overflow-hidden` from any container whose children need to escape bounds. Use `overflow-hidden` only on leaf elements (like the popover scroll area).
- **Dropdown positioning**: Use `bottom-[calc(100%+8px)]` relative to the trigger button, not the entire container. Add `z-50` to ensure it's above everything.
- **Flex shrink**: Always add `flex-shrink-0` to fixed-size elements (circular buttons, toggle knobs) that sit alongside flexible content to prevent them from being squished.
- **`whitespace-nowrap`** on label buttons that should never wrap (like "VIDEO · RAY3 · 9:16").

## 2026-03-06: Background & Preview Design
- **Flat dark backgrounds look cheap**. Use a subtle radial gradient: `radial-gradient(ellipse 70% 50% at 50% 35%, #0C0C0E 0%, #050505 60%, #030303 100%)` — gives depth without decoration.
- **Preview card should be a contained card** like Luma — dark card with rounded corners, subtle border, inner gradient, shadow. Not just a bordered box floating in space.
- **Status bar below the preview** ("Draft · 5s", engine name, ratio) gives context like Luma does.
- **Click-outside dismiss**: Every popover/overlay needs mousedown listener to dismiss on outside click. Never rely on Esc only.
- **Avatar picker as overlay**: Full-screen overlay with backdrop blur, grid of avatars. Click-outside to close. Not a new page.
- **Portrait preview (9:16)** matches what users will actually generate — more cinematic than 16:9 for the empty state.
