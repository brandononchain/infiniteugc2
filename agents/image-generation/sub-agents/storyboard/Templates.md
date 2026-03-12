# Templates — Storyboard Keyframe Artist

The storyboard agent does NOT have prescriptive frame-by-frame templates.
It has one template: "paste your script, frames are auto-generated."

The real templates live in the other image sub-agents (product-ugc, lifestyle,
food-beverage, etc.). When the storyboard agent feeds a chunk through
`generateImagePrompt()`, the image pipeline picks the right template for
that chunk's content.

## template: storyboard-any
**Name**: Auto-Storyboard
**Description**: Paste any script — frames are auto-generated from your sections
**Tags**: storyboard, auto, flexible, any-script

This is the only template. The user pastes their script (any format — markers,
numbered sections, paragraphs, or just prose). The storyboard agent chunks it,
and each chunk flows through the image pipeline which selects templates,
styles, and camera profiles based on the chunk's content.

### Example Inputs

**With markers:**
```
[HOOK] Person looks at camera with genuine surprise about this product
[PROBLEM] They show the frustrating old way of doing things
[DISCOVERY] Close up of the product, hands holding it up
[DEMO] Using the product, showing the difference
[CTA] Smiling at camera, holding product up
```

**With paragraphs:**
```
A woman sits at her vanity, morning light streaming in. She looks tired,
examining her skin in the mirror.

She picks up the new serum, curious but skeptical. Reads the label.

She applies it gently, watching it absorb into her skin.

Later that day, she catches her reflection and smiles — her skin is glowing.
```

**With numbered steps:**
```
1. Open the box and lay out all the pieces on a clean surface
2. Connect the base to the stand using the included allen wrench
3. Snap the top piece into place — you'll hear a click
4. Plug in and turn on — the LED should glow blue
5. Download the app and follow the pairing instructions
```

All three produce different numbers of keyframes (5, 4, 5) because the
script structure decides the frame count.
