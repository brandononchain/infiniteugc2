# UI Task: Luma-Style Generation Canvas

## Context & Aesthetics
We are building a new sandboxed component: `LumaGenerationCanvas.tsx`.
- **Theme:** Ultra-dark mode (`bg-[#050505]`).
- **Style:** Minimalist, linear, flat. 1px `#1A1A1A` borders.
- **Accents:** Neon Blue (`#00A3FF`) used strictly for active states, hovers, and glowing drop shadows (`shadow-[0_0_15px_rgba(0,163,255,0.5)]`).

## Component Layout Requirements

### 1. The Main Stage (Center Viewport)
- A large, centered preview container for the video.
- Minimal 1px border. No heavy panels.

### 2. The Floating Command Pill (Bottom)
- Positioned `absolute bottom-10` in the center of the stage.
- Styling: `bg-[#111111]/80`, `backdrop-blur-2xl`, `rounded-3xl`, 1px border of `#222222`.
- **Left Side:** An "Image" icon button (This triggers the Avatar selection from the user's library).
- **Center:** An auto-expanding, borderless `<textarea>` for the Script input. Placeholder: "What do you want to see..."
- **Inside Center (Top Right of Text):** A tiny dropdown text button showing the current "Video Engine" (e.g., "HeyGen", "Sora 2 Pro", "VEO3").
- **Right Side:** 1. A "Book" or "Library" icon (Opens the Script Templates dropdown: Testimonial, Product Demo, etc.).
  2. A "Sliders/Settings" icon (Opens the Advanced Customization Popover - see below).
  3. A circular "Generate" arrow button with the Neon Blue background and glow.

### 3. The Advanced Customization Popover (Slide-Up Menu)
When the user clicks the "Settings" icon in the pill, a glass-morphism panel slides up just above the pill. It must contain 3 sleek tabs/accordions:
- **Tab 1: Auto-Captions** - Toggle Switch (Enable/Disable).
  - Dropdown for Caption Style (White, Black, Red, Plain White).
- **Tab 2: Text Overlays**
  - Text input area.
  - Dropdown for Style.
  - Number inputs for Start (s), Duration (s), and Font size.
  - Ghost button to "Add Layer".
- **Tab 3: Reply Comment (TikTok Style)**
  - Toggle Switch (Enable/Disable).
  - Avatar upload button & Name input.
  - Comment text area.
  - Sliders for Scale and Rotation.
  - Number inputs for Start (s) and Duration (s).