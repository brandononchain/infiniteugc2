# Luma UI Sandbox Replication — Architecture & Polish Plan

## Status: COMPLETE (v2 — Full Polish Pass)

## Architecture
```
src/components/sandbox/luma-ui/
  LumaGenerationCanvas.tsx    -- Root: clean dark canvas, cinematic empty state, bottom pill zone
  CommandPill.tsx              -- Two-row prompt bar: textarea + icon controls, KEYFRAME/REFERENCE/MODIFY pills
  AdvancedPopover.tsx          -- Glassmorphism popover, tab bar with layoutId underline
  tabs/
    AutoCaptionsTab.tsx        -- Toggle + caption style dropdown, label + subtitle
    TextOverlaysTab.tsx        -- Layer management with char count, styled inputs, empty state
    ReplyCommentTab.tsx        -- Avatar upload, -/+ steppers, sliders, char count, reset to default
```

## Polish v2 Checklist
- [x] Removed tacky dot grid and decorative gradients
- [x] Main stage: clean dark surface, subtle Play icon, minimalist empty state
- [x] Two-row command pill matching Luma layout (textarea top, controls bottom)
- [x] KEYFRAME / REFERENCE / MODIFY action pills above prompt bar
- [x] Left icon row: Image, Plus, VideoCamera, Infinity, Settings divider
- [x] DRAFT toggle with custom mini switch
- [x] Engine+ratio selector "VIDEO · RAY3 · 9:16" with grouped dropdown
- [x] AdvancedPopover: matching glass style, tab underline with layoutId
- [x] AutoCaptionsTab: title + subtitle, reusable Toggle component
- [x] TextOverlaysTab: layer cards with char count (x/500), style dropdown, empty state
- [x] ReplyCommentTab: avatar + Upload btn, -/+ steppers, sliders, char count (x/300), reset link
- [x] Consistent white/[0.04-0.08] surface system, no tacky colored borders
- [x] `npx tsc --noEmit` — 0 errors
- [x] `/luma` — HTTP 200, clean render

## Design System (v2 Refined)
| Token | Value |
|-------|-------|
| bg-canvas | #050505 |
| bg-surface | #0A0A0A |
| bg-elevated | #0F0F0F/80 |
| border | white/[0.06-0.08] |
| input-bg | white/[0.04] |
| input-hover | white/[0.06] |
| input-focus | [#00A3FF]/50 border |
| accent | #00A3FF |
| accent-glow | rgba(0,163,255,0.35) |
| text-primary | zinc-100/200 |
| text-label | zinc-500 |
| text-muted | zinc-600 |
