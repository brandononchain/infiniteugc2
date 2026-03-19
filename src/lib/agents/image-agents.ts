/* ═══════════════════════════════════════════════════════════════════════════════
   IMAGE GENERATION AGENT SYSTEM
   ═══════════════════════════════════════════════════════════════════════════════
   Master agent + 9 specialist sub-agents for image prompt generation.
   Each sub-agent is a full agent with identity, skills, rules, and templates.
   Includes the Storyboard agent for batch keyframe generation via nano_banana.
   ═══════════════════════════════════════════════════════════════════════════════ */

import type {
  ImageAgentCategory,
  ImageStyle,
  ImageSubAgent,
  ImageAgentTemplate,
  ImageClassification,
  ImageGenerationPayload,
  StoryboardKeyframe,
  StoryboardPayload,
  InternalPromptStep,
  InternalPromptConfig,
  ProductContext,
} from "./types";

// ── Routing Table (from Master Agent.md) ─────────────────────────────────────

const ROUTING_SIGNALS: Record<ImageAgentCategory, string[]> = {
  "product-ugc": ["product", "bottle", "package", "unboxing", "flatlay", "brand shot", "packaging", "box", "label", "cream", "serum", "supplement"],
  "lifestyle": ["morning", "routine", "cozy", "home", "desk", "workspace", "daily", "apartment", "living room", "bedroom", "zen", "calm", "ritual"],
  "food-beverage": ["food", "drink", "coffee", "cocktail", "plate", "recipe", "kitchen", "restaurant", "latte", "wine", "beer", "dessert", "pastry", "meal"],
  "fashion-beauty": ["fashion", "outfit", "beauty", "skincare", "makeup", "vanity", "ootd", "dress", "accessory", "jewelry", "lipstick", "nail", "hair"],
  "tech-gadgets": ["tech", "device", "gadget", "phone", "laptop", "wearable", "screen", "headphone", "keyboard", "monitor", "camera", "earbuds", "watch"],
  "abstract-artistic": ["abstract", "texture", "gradient", "pattern", "3d", "geometric", "art", "marble", "liquid", "fractal", "surreal", "void", "neon"],
  "social-media": ["social", "post", "story", "reel", "quote", "testimonial", "carousel", "background", "card", "overlay", "text-ready", "thumbnail"],
  "brand-marketing": ["brand", "campaign", "hero", "ad", "marketing", "launch", "premium", "commercial", "advertisement", "luxury", "editorial ad"],
  "b-roll": ["b-roll", "b roll", "broll", "cutaway", "insert shot", "filler", "transition", "ambient", "establishing shot", "detail shot", "texture shot", "atmosphere shot", "environment shot"],
  "storyboard": ["storyboard", "keyframe", "shot list", "scene breakdown", "visual plan", "script to images", "pre-production", "shot by shot", "sequence", "scene 1", "scene 2", "frames"],
};

// ── Style Modifiers (from Master Skills.md) ──────────────────────────────────

const STYLE_MODIFIERS: Record<ImageStyle, string> = {
  photorealistic: "8K RAW photograph, natural lighting, shallow depth of field, shot on Sony A7IV, true-to-life colors",
  cinematic: "anamorphic 2.39:1 feel, film grain, Arri Alexa color science, warm color grading, cinematic bokeh",
  editorial: "high fashion editorial style, Vogue-quality, studio lighting, clean composition, magazine-ready",
  minimal: "negative space dominant, single subject, muted palette, geometric framing, less is more",
  vibrant: "saturated rich colors, dynamic composition, energetic, bold contrasts, eye-catching",
  moody: "low key lighting, deep shadows, atmospheric, desaturated, noir-influenced, emotional",
  soft_dreamy: "soft focus, pastel palette, ethereal glow, gauze diffusion, romantic and dreamy",
  raw_authentic: "candid unposed feel, natural imperfections, documentary style, real and honest",
};

// ── Aspect Ratio Intelligence (from Master Skills.md) ────────────────────────

const ASPECT_RATIO_HINTS: Record<string, string> = {
  "9:16": "vertical composition, leading lines upward, portrait framing",
  "16:9": "wide establishing shot, rule of thirds horizontal, cinematic",
  "1:1": "center-weighted, symmetrical or diagonal composition, feed-optimized",
  "4:3": "balanced framing, traditional photographic composition",
  "3:4": "slight vertical emphasis, headroom-aware framing",
};

// ── Negative Prompt Library (from Master Skills.md) ──────────────────────────

const BASE_NEGATIVES = "blurry, low quality, watermark, text overlay, distorted, deformed, jpeg artifacts, oversaturated";

const CATEGORY_NEGATIVES: Partial<Record<ImageAgentCategory, string>> = {
  "product-ugc": "floating objects, inconsistent shadows, unrealistic reflections, empty void background",
  "food-beverage": "unappetizing, plastic-looking, artificial colors, blue lighting, undercooked",
  "fashion-beauty": "extra fingers, distorted faces, unnatural skin, unflattering angle",
  "tech-gadgets": "messy cables, cluttered, soft textures, warm amber tones only",
  "abstract-artistic": "generic, clipart, flat, rainbow gradient, cliched",
  "social-media": "complex composition, muddy colors, low contrast",
  "brand-marketing": "cluttered, amateur lighting, product obscured",
  "lifestyle": "sterile, cold, overcrowded, harsh artificial lighting",
  "b-roll": "people as primary subject, text, branding, direct product focus, busy compositions",
};

// ── Sub-Agent Definitions ────────────────────────────────────────────────────

const PRODUCT_UGC_TEMPLATES: ImageAgentTemplate[] = [
  {
    id: "flatlay-hero",
    name: "Product Flatlay",
    description: "Clean top-down product arrangement with styled props",
    tags: ["flatlay", "overhead", "styled", "clean"],
    prompt: "Premium product flatlay arrangement on natural linen surface, soft overhead window light creating gentle shadows, product centered with 2-3 carefully placed lifestyle props, slightly asymmetric layout for authentic UGC feel, shallow depth of field on edges, warm neutral color palette, shot from directly above, 50mm lens equivalent",
  },
  {
    id: "hand-held-reveal",
    name: "Hand-Held Product Reveal",
    description: "Authentic hand-held product shot with natural grip",
    tags: ["hand-held", "authentic", "reveal", "close-up"],
    prompt: "Close-up of a hand naturally holding a premium product, soft side lighting from a large window, background softly blurred showing a lived-in lifestyle setting, skin tones warm and natural, product label facing camera at slight angle, authentic casual grip, micro-details visible on product surface, shot on 85mm f/1.8",
  },
  {
    id: "unboxing-moment",
    name: "Unboxing Experience",
    description: "First-reveal unboxing with premium packaging",
    tags: ["unboxing", "packaging", "reveal", "premium"],
    prompt: "Overhead view of premium product unboxing moment, branded box opened with tissue paper pulled aside, product partially revealed, hands gently lifting the product, warm ambient room lighting with soft window fill, desk or bed surface visible, excitement and discovery mood, lifestyle setting in soft focus background",
  },
  {
    id: "shelf-context",
    name: "Shelf/Desk In-Context",
    description: "Product displayed in its natural environment",
    tags: ["context", "shelf", "natural", "environment"],
    prompt: "Product placed naturally on a styled shelf or desk surface, surrounded by complementary lifestyle items slightly out of focus, soft directional light from the side creating depth shadows, clean and organized but not sterile arrangement, authentic home environment, product as the clear focal point with leading lines drawing the eye, warm color temperature",
  },
  {
    id: "minimal-studio",
    name: "Minimal Studio Hero",
    description: "Clean studio-style product shot with gradient background",
    tags: ["studio", "minimal", "hero", "clean"],
    prompt: "Single product on a smooth matte surface with a seamless gradient background, controlled studio lighting with soft key light and subtle rim light, precise shadow under product grounding it to the surface, clean negative space surrounding the subject, product material and texture details crisp and visible, commercial quality with slight editorial edge",
  },
  {
    id: "texture-closeup",
    name: "Texture Detail Macro",
    description: "Extreme close-up highlighting product materials",
    tags: ["macro", "texture", "detail", "close-up"],
    prompt: "Extreme macro close-up of product surface texture and material details, shallow depth of field with only the texture plane in focus, side lighting raking across the surface to reveal micro-details, material grain and finish clearly visible, abstract yet identifiable as the product, shot on 100mm macro lens f/4, color palette derived from the product itself",
  },
  // ── NEW: Selfie with Product ───────────────────────────────────────────────
  {
    id: "selfie-product",
    name: "Selfie with Product",
    description: "Front-camera selfie-style shot holding or showing a product",
    tags: ["selfie", "ugc", "front-camera", "authentic"],
    prompt: "Front-camera selfie perspective of a person holding a product up near their face, natural indoor lighting from a window, slightly wide-angle distortion typical of phone front camera, genuine happy expression, product label visible and well-lit, bathroom mirror or bedroom background softly blurred, warm skin tones, authentic phone selfie quality with UGC energy, casual and relatable, shot on 24mm equivalent front-facing camera",
  },
  // ── NEW: Mirror Shot ───────────────────────────────────────────────────────
  {
    id: "mirror-shot",
    name: "Mirror Shot",
    description: "Product shown in a mirror reflection — vanity, bathroom, or full-length",
    tags: ["mirror", "reflection", "ugc", "selfie"],
    prompt: "Mirror reflection shot showing a person holding or using a product, visible in a clean bathroom or vanity mirror, the phone or camera visible in their hands capturing the moment, ambient bathroom lighting with warm overhead and soft natural window light, mirror edges slightly visible framing the scene, steam or soft haze optional for skincare, authentic Instagram mirror selfie energy, relatable and casual, product clearly visible in the reflection",
  },
  // ── NEW: POV Shot ──────────────────────────────────────────────────────────
  {
    id: "pov-first-person",
    name: "POV / First Person",
    description: "Shot from the user's perspective — hands visible, looking down at product",
    tags: ["pov", "first-person", "hands", "perspective"],
    prompt: "First-person POV perspective looking down at hands holding or interacting with a product, the viewer's arms and hands visible in frame from their perspective, natural setting visible in the lower background — desk surface, lap, outdoor scene, soft natural overhead lighting, product details clearly visible from this intimate angle, creates an immersive you-are-there feeling, authentic and personal, shallow depth of field on the product, 24mm wide-angle first-person perspective",
  },
  // ── NEW: 3rd Person Lifestyle ──────────────────────────────────────────────
  {
    id: "third-person",
    name: "3rd Person Lifestyle",
    description: "Subject photographed naturally from outside — candid observer perspective",
    tags: ["third-person", "candid", "lifestyle", "observer"],
    prompt: "Candid third-person lifestyle shot of a person using a product naturally in their environment, shot from a respectful distance as if observed by a friend, the person is engaged with the product not looking at camera, soft natural lighting from the environment — window light in a kitchen or outdoor ambient, environmental context rich and detailed, product visible but integrated naturally into the scene, 50mm f/2.0 creating gentle subject separation from background, documentary-style authenticity, warm and relatable",
  },
  // ── NEW: Podcast Style ─────────────────────────────────────────────────────
  {
    id: "podcast-setup",
    name: "Podcast / Interview Setup",
    description: "Professional podcast or interview-style framing with product placement",
    tags: ["podcast", "interview", "studio", "microphone"],
    prompt: "Professional podcast or interview-style composition, person seated at a desk or table with a quality microphone visible, product placed naturally on the desk within arm's reach, warm studio-style lighting with soft key light from the side and gentle hair light, acoustic panels or bookshelves in soft focus background, professional but approachable atmosphere, product visible and well-lit on the desk surface, clean audio-studio aesthetic, 50mm f/2.0, warm neutral color palette with subtle brand accent",
  },
  // ── NEW: Clothing / Outfit Shot ────────────────────────────────────────────
  {
    id: "clothing-ootd",
    name: "Clothing / Outfit Display",
    description: "Clothing item styled on a person or as a flatlay",
    tags: ["clothing", "fashion", "outfit", "apparel"],
    prompt: "Clothing item displayed beautifully — either worn on a person in a natural setting or laid flat on a clean surface, fabric texture and quality clearly visible with side lighting revealing weave and material, if worn: shot from mid-thigh up showing the fit and drape naturally, if flatlay: carefully styled on linen or wood surface with minimal accessories, color accuracy is paramount, warm natural lighting preserving true fabric colors, 85mm f/2.0 for worn shots or 50mm f/4 for flatlays, fashion-forward but accessible UGC energy",
  },
  // ── NEW: Software iPhone/Mobile Screenshot ─────────────────────────────────
  {
    id: "software-mobile",
    name: "Software / App Mobile Shot",
    description: "iPhone or mobile device showing app UI in lifestyle context",
    tags: ["software", "app", "mobile", "iphone", "screenshot"],
    prompt: "Close-up lifestyle shot of a hand holding an iPhone or modern smartphone, screen clearly visible showing an app interface with clean readable UI, the device held at a natural viewing angle slightly tilted toward camera, soft natural background — cafe table, cozy couch, or modern desk, screen brightness balanced with ambient lighting so the UI is clearly visible without washing out, shallow depth of field on the device with soft background, warm skin tones on the hand, 85mm f/1.8, clean and aspirational tech-lifestyle feel",
  },
  // ── NEW: Software Web/Desktop Screenshot ───────────────────────────────────
  {
    id: "software-web",
    name: "Software / Web Desktop Shot",
    description: "Laptop or desktop screen showing web application or SaaS product",
    tags: ["software", "web", "desktop", "saas", "laptop"],
    prompt: "Modern laptop or desktop monitor displaying a web application interface, shot from a slight elevated angle showing both the screen content and the premium workspace surrounding it, screen content clearly visible and readable with clean UI design, MacBook or premium laptop on a minimal desk, soft ambient lighting with the screen as a secondary light source casting subtle glow, coffee cup and minimal props suggesting a productive workspace, 35mm f/2.8 capturing both screen and environment, clean modern aesthetic",
  },
  // ── NEW: Product-in-Context (add product to any scene) ─────────────────────
  {
    id: "product-in-scene",
    name: "Product Placed in Scene",
    description: "Any product naturally placed into a specific lifestyle environment",
    tags: ["product", "context", "scene", "placement"],
    prompt: "A product naturally placed and integrated into a lifestyle scene as if it belongs there, the product is clearly visible and well-lit but not staged-looking, surrounding environment tells a story about who uses this product and when, warm natural lighting from the environment, the product occupies about 15-25% of the frame — present but not overwhelming, complementary props and surfaces that make sense for the product's use case, authentic lived-in environment, 50mm f/2.0 with the product at the focal plane",
  },
];

const LIFESTYLE_TEMPLATES: ImageAgentTemplate[] = [
  {
    id: "morning-ritual",
    name: "Morning Routine Scene",
    description: "Warm morning lifestyle moment with natural light",
    tags: ["morning", "routine", "golden-hour", "cozy"],
    prompt: "Warm morning scene in a sunlit modern apartment, golden hour light streaming through large windows casting long soft shadows, steaming ceramic mug on a wooden side table, rumpled linen bedding or sofa throw in background, a journal or book placed casually nearby, plants on the windowsill catching the light, calm and serene atmosphere, Portra 400 film aesthetic, 35mm lens",
  },
  {
    id: "workspace-zen",
    name: "Curated Workspace",
    description: "Clean productive desk setup with personality",
    tags: ["workspace", "desk", "productivity", "minimal"],
    prompt: "Thoughtfully curated workspace scene from a slight elevated angle, clean wooden desk with minimal setup — laptop, ceramic mug, small potted plant, and one personal object, soft natural light from a side window, white or light gray walls with subtle texture, cable-free and organized, warm neutral color palette with one accent color, depth of field blurring the background wall, 50mm lens",
  },
  {
    id: "golden-hour-outdoor",
    name: "Golden Hour Outdoor Living",
    description: "Atmospheric outdoor lifestyle moment at golden hour",
    tags: ["outdoor", "golden-hour", "warm", "living"],
    prompt: "Outdoor living scene during golden hour, warm amber sunlight backlighting the subject area, patio or garden setting with natural materials — wooden furniture, woven textiles, terracotta pots, casual food and drink spread visible, lush greenery softly blurred in background, magical warm glow on all surfaces, lens flare from low sun, 35mm f/1.8 with dreamy bokeh",
  },
  {
    id: "cozy-evening",
    name: "Cozy Evening Moment",
    description: "Intimate warm evening scene with soft lighting",
    tags: ["evening", "cozy", "warm", "intimate"],
    prompt: "Intimate cozy evening scene, warm lamp light and candle glow as primary light sources, soft throw blanket over a comfortable sofa, book open face-down on the armrest, steaming drink in a handmade ceramic cup, warm earth tones and deep shadows, window showing dusky blue sky outside, textures of wool and linen visible, low angle perspective, 35mm f/1.4 shallow depth of field",
  },
  {
    id: "wellness-self-care",
    name: "Wellness & Self-Care",
    description: "Serene self-care moment with natural products",
    tags: ["wellness", "self-care", "serene", "natural"],
    prompt: "Serene self-care and wellness scene, natural skincare products on a marble or stone surface, soft white towels, eucalyptus sprigs or dried lavender, bathroom or spa-like environment with natural light, steam or mist visible in the air, clean whites and soft greens, tactile textures — stone, glass, ceramic, cotton, calm meditative atmosphere, overhead or 45-degree angle, soft even lighting",
  },
];

const FOOD_BEVERAGE_TEMPLATES: ImageAgentTemplate[] = [
  {
    id: "coffee-art",
    name: "Artisan Coffee Scene",
    description: "Beautifully crafted coffee with latte art and cozy setting",
    tags: ["coffee", "latte-art", "morning", "artisan"],
    prompt: "Artisan coffee in a handmade ceramic cup with intricate latte art visible on the crema surface, placed on a dark wooden table, soft morning light from the side creating a warm glow on the liquid, slight steam rising, scattered coffee beans and a small pastry in soft focus nearby, warm amber and brown tones, cozy cafe atmosphere, 85mm f/2.0 shallow depth of field",
  },
  {
    id: "cocktail-dramatic",
    name: "Dramatic Cocktail Shot",
    description: "Moody bar-lit cocktail with condensation and garnish",
    tags: ["cocktail", "bar", "moody", "dramatic"],
    prompt: "Sophisticated cocktail in a crystal glass on a dark bar surface, dramatic side lighting creating deep shadows and highlights on the glass, condensation droplets catching the light, elegant garnish — citrus peel twist or herb sprig, ice visible through the glass refracting light, moody bar atmosphere with warm ambient glow in background, rich deep colors, shot at eye level, 85mm f/1.8",
  },
  {
    id: "plated-dish",
    name: "Chef's Plated Dish",
    description: "Beautifully composed plated dish at 45-degree angle",
    tags: ["food", "plated", "chef", "culinary"],
    prompt: "Beautifully plated dish on a rustic ceramic plate viewed from 45-degree angle, chef-level presentation with precise garnishing, sauce artfully drizzled, fresh herb garnish with micro-greens, steam gently rising from the hot food, natural window light from the left with soft shadow side, dark slate or wooden surface, linen napkin and vintage cutlery partially visible, vibrant natural food colors, 85mm f/2.0",
  },
  {
    id: "overhead-spread",
    name: "Table Spread Overhead",
    description: "Full table spread shot from directly above",
    tags: ["overhead", "spread", "communal", "feast"],
    prompt: "Overhead flat lay of a curated food spread across a large worn wooden table, multiple dishes and bowls arranged organically, hands reaching in to serve or eat, scattered ingredients — herbs, breadcrumbs, lemon wedges, rustic linens and mismatched ceramic dishes, natural overhead light creating even illumination with subtle shadows, warm inviting color palette, communal dining atmosphere, shot from directly above",
  },
  {
    id: "ingredient-still-life",
    name: "Raw Ingredient Arrangement",
    description: "Beautiful arrangement of fresh ingredients",
    tags: ["ingredients", "still-life", "fresh", "raw"],
    prompt: "Artistic arrangement of fresh raw ingredients on a dark surface, vibrant natural colors of vegetables herbs and spices creating visual contrast, water droplets on fresh produce catching the light, organized chaos composition — partly scattered partly grouped, overhead angle with dramatic side light raking across textures, deep shadows and rich colors, food magazine editorial quality, 50mm f/4",
  },
];

const FASHION_BEAUTY_TEMPLATES: ImageAgentTemplate[] = [
  {
    id: "vanity-flatlay",
    name: "Beauty Vanity Flatlay",
    description: "Luxury beauty product arrangement on marble or mirror surface",
    tags: ["beauty", "flatlay", "vanity", "luxury"],
    prompt: "Luxury beauty flatlay on white marble surface, premium skincare and makeup products arranged with intentional spacing, gold and rose gold packaging catching soft overhead light, fresh flowers — peonies or roses — as accent props, soft shadows creating depth, a small mirror reflecting light, clean elegant composition with breathing room, warm neutral and blush color palette, overhead shot, 50mm f/2.8",
  },
  {
    id: "texture-swatch",
    name: "Beauty Texture Swatch",
    description: "Macro close-up of makeup or skincare textures",
    tags: ["texture", "macro", "beauty", "swatch"],
    prompt: "Extreme close-up macro shot of cosmetic texture swatches on clean skin or smooth surface, visible product consistency — creamy, shimmer particles, matte powder, or glossy, beautiful light catching micro-shimmer and texture variations, abstract and artistic composition, skin-tone or product-colored palette, soft directional light revealing every detail, 100mm macro lens f/4, clinical beauty meets editorial art",
  },
  {
    id: "ootd-editorial",
    name: "OOTD Editorial",
    description: "Full outfit shot with editorial fashion photography feel",
    tags: ["fashion", "ootd", "editorial", "outfit"],
    prompt: "Full-length outfit-of-the-day editorial shot, model standing in an urban or architectural setting, natural daylight creating beautiful shadows, outfit styled with intentional accessories, confident relaxed pose, environmental background complementing the outfit's color palette, shallow depth of field separating subject from background, fashion magazine quality, 70mm f/2.0, warm natural color grading",
  },
  {
    id: "skincare-glow",
    name: "Skincare Glow Close-Up",
    description: "Dewy skin close-up with skincare product",
    tags: ["skincare", "glow", "close-up", "dewy"],
    prompt: "Close-up beauty shot focusing on luminous dewy skin, glass-skin finish with light bouncing off cheekbones and nose bridge, a skincare product held delicately near the face or applied to skin, soft beauty lighting from a large diffused source creating even flattering illumination, clean background in soft focus, natural healthy skin texture visible, fresh and hydrated look, 85mm f/1.8, warm and clean color palette",
  },
];

const TECH_GADGETS_TEMPLATES: ImageAgentTemplate[] = [
  {
    id: "device-hero",
    name: "Device Hero Shot",
    description: "Premium hero angle of a tech device on dark surface",
    tags: ["tech", "hero", "premium", "dark"],
    prompt: "Premium tech device hero shot on a matte dark surface, product at a slight 20-degree angle showing both the face and edge profile, controlled studio lighting with sharp rim light defining the edges, screen subtly glowing, material details visible — brushed aluminum, glass, precise machining, deep black background with subtle gradient, reflections on the surface grounding the device, 50mm f/2.8, high contrast clean digital",
  },
  {
    id: "creator-workspace",
    name: "Creator Tech Workspace",
    description: "Premium desk setup with multiple devices and clean aesthetics",
    tags: ["workspace", "tech", "setup", "creator"],
    prompt: "Premium tech workspace overhead shot, ultrawide monitor displaying content, mechanical keyboard, wireless mouse on a dark desk mat, smartphone and wireless earbuds case positioned nearby, subtle LED ambient lighting in cool blue or warm accent, organized and cable-free, plant in minimal pot as single organic element, dark modern aesthetic with clean lines, soft overhead lighting with monitor glow as fill",
  },
  {
    id: "wearable-lifestyle",
    name: "Wearable Tech Lifestyle",
    description: "Smartwatch or earbuds in real-world context",
    tags: ["wearable", "lifestyle", "context", "tech"],
    prompt: "Close-up lifestyle shot of wearable tech on a person, smartwatch on wrist or earbuds being placed in ear, natural but stylized lighting showing the device's finish and screen, environmental context — urban outdoor or modern interior, shallow depth of field isolating the device, skin tones warm and natural contrasting with the cool tech materials, 85mm f/1.8, confident and aspirational mood",
  },
  {
    id: "dark-studio-float",
    name: "Dark Studio Float",
    description: "Dramatic floating product shot on pure dark background",
    tags: ["dark", "studio", "dramatic", "floating"],
    prompt: "Tech product dramatically lit against a pure black background creating a floating effect, sharp rim lights from two sides defining every edge and curve, subtle colored accent light — cool blue or electric purple — adding dimension, material details razor sharp — every button, seam, port visible, device appears weightless suspended in darkness, cinematic product photography, 100mm macro level detail, ultra-high contrast",
  },
];

const ABSTRACT_ARTISTIC_TEMPLATES: ImageAgentTemplate[] = [
  {
    id: "liquid-marble",
    name: "Liquid Marble Flow",
    description: "Mesmerizing liquid marble texture with metallic veins",
    tags: ["abstract", "liquid", "marble", "texture"],
    prompt: "Hyper-detailed liquid marble texture in motion, swirling veins of metallic gold and rose gold flowing through deep black and cream marble, viscous fluid dynamics frozen mid-movement, light catching the metallic veins creating bright caustic reflections, extreme macro perspective making it feel like an alien landscape, rich deep shadows in the crevices, 8K render quality, abstract art gallery piece",
  },
  {
    id: "gradient-mesh",
    name: "Gradient Mesh Composition",
    description: "Smooth flowing gradient mesh with depth and luminosity",
    tags: ["gradient", "mesh", "smooth", "modern"],
    prompt: "Ultra-smooth gradient mesh composition, flowing color transitions between deep indigo, electric teal, and warm amber, soft undulating 3D surface with gentle peaks and valleys catching light differently, atmospheric depth with some areas sharp and others falling into soft blur, clean minimalist composition with vast negative space, subtle noise texture adding analog warmth, modern digital art aesthetic, 4K resolution",
  },
  {
    id: "sacred-geometry",
    name: "Sacred Geometry Construct",
    description: "Intricate geometric patterns with spiritual precision",
    tags: ["geometry", "sacred", "intricate", "precision"],
    prompt: "Intricate sacred geometry construction floating in dark space, precise golden ratio spirals and platonic solids interlocking, thin luminous lines forming the geometric framework, subtle glow emanating from intersection points, deep cosmic black background with subtle star dust, metallic gold and silver materials on the geometry, dramatic lighting creating long shadows on an implied ground plane, 3D render with crystalline detail, mystical and mathematical beauty",
  },
  {
    id: "floating-objects",
    name: "Floating 3D Objects",
    description: "Surreal arrangement of 3D objects suspended in space",
    tags: ["3d", "floating", "surreal", "objects"],
    prompt: "Surreal arrangement of primitive 3D shapes floating in a vast soft-gradient void, spheres cubes and torus forms in matte and glossy materials — terracotta, chrome, frosted glass, rough concrete, dramatic directional lighting casting long precise shadows onto a distant ground plane, objects at varying depths creating parallax, soft atmospheric haze between layers, contemporary 3D art aesthetic, Cinema 4D render quality, clean and contemplative",
  },
  {
    id: "bioluminescent",
    name: "Bioluminescent World",
    description: "Glowing organic forms in deep darkness",
    tags: ["bioluminescent", "glow", "organic", "dark"],
    prompt: "Bioluminescent organic forms glowing in deep underwater darkness, tendrils and filaments of living light in electric blue and warm amber, soft particle glow emanating from organic structures, deep bokeh creating depth in the dark water, microscopic detail on the luminous surfaces — cellular patterns and translucent membranes, mysterious and meditative atmosphere, macro photography aesthetic applied to a fantastical subject, rich contrast between absolute dark and intense luminous highlights",
  },
  // ── NEW: 3D Vegetable / Food Art ───────────────────────────────────────────
  {
    id: "3d-vegetable",
    name: "3D Vegetable / Food Art",
    description: "Hyper-stylized 3D rendered vegetables and food with artistic treatment",
    tags: ["3d", "vegetable", "food-art", "render", "stylized"],
    prompt: "Hyper-stylized 3D render of vibrant fresh vegetables or fruits, each piece with slightly exaggerated proportions and impossible perfection — glossy surfaces with subsurface scattering showing the light passing through translucent flesh, droplets of water catching dramatic studio lighting, arranged on a clean infinite gradient surface, Pixar-quality rendering with photorealistic materials on cartoon-proportioned subjects, dramatic rim lighting creating glowing edges on the organic forms, rich saturated natural colors pushed 20% beyond real, Cinema 4D or Octane render aesthetic",
  },
  // ── NEW: 3D Animation Style ────────────────────────────────────────────────
  {
    id: "3d-animation",
    name: "3D Animation / Pixar Style",
    description: "Objects or scenes rendered in modern 3D animation style",
    tags: ["3d", "animation", "pixar", "render", "cartoon"],
    prompt: "Modern 3D animation-style render of a scene or object, Pixar or Dreamworks quality with clean smooth surfaces, soft global illumination creating beautiful bounced light, subsurface scattering on translucent materials, slightly stylized proportions — rounder softer friendlier than reality, rich saturated color palette with warm lighting, shallow depth of field creating cinematic bokeh, subtle ambient occlusion in crevices, the scene feels like a frame from a high-budget animated film, clean and inviting with remarkable material detail",
  },
];

const SOCIAL_MEDIA_TEMPLATES: ImageAgentTemplate[] = [
  {
    id: "quote-card-bg",
    name: "Quote Card Background",
    description: "Clean gradient background designed for text overlay",
    tags: ["social", "quote", "background", "text-ready"],
    prompt: "Elegant gradient background for a social media quote card, smooth transition from deep rich tones at edges to a lighter center zone ideal for text overlay, subtle texture — fine grain or soft fabric weave — adding depth, warm and inviting color palette shifting from deep plum to soft blush or navy to sky blue, clean and modern with no distracting elements, large clear central area for typography, high resolution suitable for 1080x1080",
  },
  {
    id: "testimonial-backdrop",
    name: "Testimonial Background",
    description: "Warm trustworthy backdrop for customer testimonials",
    tags: ["social", "testimonial", "trust", "warm"],
    prompt: "Warm and trustworthy background scene for a customer testimonial graphic, soft bokeh lifestyle environment — blurred coffee shop or sunny office interior, warm golden light with gentle lens flare, large soft blurred area in the center-left for text overlay with star ratings, feels authentic and human, colors are warm amber and soft cream, approachable and premium simultaneously, high contrast edges with soft dreamy center",
  },
  {
    id: "before-after-split",
    name: "Before/After Split Background",
    description: "Split composition background designed for transformation overlays",
    tags: ["social", "before-after", "split", "transformation"],
    prompt: "Split-composition background for a before and after comparison graphic, left side slightly darker muted and cooler tones representing before state, right side brighter warmer and more vibrant representing after state, subtle diagonal or clean vertical dividing line between the two zones, both sides have open space for overlay content, dramatic contrast between the two moods while maintaining visual cohesion, clean modern aesthetic",
  },
  {
    id: "before-after-skincare",
    name: "Before/After Skincare",
    description: "Skincare transformation — dull skin to glowing radiant skin",
    tags: ["before-after", "skincare", "transformation", "glow"],
    prompt: "Side-by-side skincare transformation image, left side showing skin with visible texture and uneven tone under flat unflattering fluorescent-style lighting, right side showing the same skin area now glowing and radiant with dewy finish under warm flattering beauty lighting, close-up on skin texture so the difference is dramatic and visible, clean clinical comparison format, 85mm macro f/2.8, skin tones natural and realistic on both sides, the lighting change alone tells the story of transformation",
  },
  {
    id: "before-after-space",
    name: "Before/After Space Transformation",
    description: "Room or space makeover — cluttered to organized, or old to new",
    tags: ["before-after", "space", "room", "transformation"],
    prompt: "Before and after room transformation composition, left half showing a slightly messy or dated space with cooler muted lighting, right half showing the same angle of a beautifully organized and styled space with warm inviting lighting, the architectural bones are the same on both sides creating a clear comparison, dramatic improvement in styling lighting and atmosphere, wide angle 24mm to capture the full space, interior design magazine quality on the after side",
  },
  {
    id: "story-atmosphere",
    name: "Story Background Atmosphere",
    description: "Full-bleed vertical atmospheric background for Stories",
    tags: ["social", "story", "vertical", "atmospheric"],
    prompt: "Full-bleed vertical atmospheric background for social media Stories, dramatic gradient sky or abstract light patterns filling the 9:16 frame, depth created through layers of soft light and shadow, intentional clear zones at top-third and bottom-third for text and interactive elements, vibrant but not overwhelming color palette, slight organic movement feel — clouds, light rays, or bokeh particles, modern and eye-catching, optimized for mobile vertical viewing",
  },
];

const BRAND_MARKETING_TEMPLATES: ImageAgentTemplate[] = [
  {
    id: "hero-campaign",
    name: "Campaign Hero Shot",
    description: "The definitive hero image for a product launch campaign",
    tags: ["campaign", "hero", "launch", "premium"],
    prompt: "Premium campaign hero shot of a product on an aspirational surface, dramatic controlled studio lighting with precise key light and subtle fill creating depth and dimension, product positioned at golden ratio with intentional negative space on the left for headline copy, rich background gradient or premium environment in soft focus, every surface detail rendered at commercial quality — reflections, materials, finish, color-graded to match a premium brand palette, Phase One medium format quality, 70mm f/2.0",
  },
  {
    id: "lifestyle-ad",
    name: "Lifestyle Ad Scene",
    description: "Product in an aspirational lifestyle context for advertising",
    tags: ["lifestyle", "ad", "aspirational", "commercial"],
    prompt: "Aspirational lifestyle advertising scene with the product naturally integrated into a premium environment, model or lifestyle moment suggesting the brand's target audience, warm but controlled natural lighting with subtle fill, product clearly visible and beautifully lit even within the broader scene, environment communicates the brand's world — premium, modern, desirable, intentional copy space maintained, commercial photography quality with editorial lifestyle warmth, 50mm f/2.0",
  },
  {
    id: "packaging-hero",
    name: "Packaging Design Showcase",
    description: "Product packaging presented as a design object",
    tags: ["packaging", "design", "showcase", "commercial"],
    prompt: "Product packaging displayed as a premium design object, clean studio environment with controlled lighting revealing the packaging's materials and print quality, slight angle showing the three-dimensional form, embossing and finishing details visible — foil stamp, texture, die cut, surface it sits on complements the packaging's color palette, generous breathing room around the subject, commercial catalog quality, clean precise shadows, 70mm f/4 for edge-to-edge sharpness",
  },
  {
    id: "premium-ad-layout",
    name: "Ad-Ready Layout",
    description: "Image specifically composed for ad creative with text zones",
    tags: ["ad-ready", "layout", "commercial", "text-zones"],
    prompt: "Premium product photograph specifically composed for advertising layout, product positioned in the right third of the frame with the left two-thirds maintaining clean open space with subtle gradient for text overlay, top-down hierarchy — headline zone at top, product as visual anchor, CTA zone at bottom, controlled studio lighting creating an elegant mood, brand-appropriate color palette with no more than 3 dominant colors, commercial retouching quality, sharp product with soft environmental context",
  },
];

// ── B-Roll Templates ─────────────────────────────────────────────────────────

const BROLL_TEMPLATES: ImageAgentTemplate[] = [
  {
    id: "broll-texture-detail",
    name: "Texture / Material Detail",
    description: "Extreme close-up of a surface, material, or texture — abstract and cinematic",
    tags: ["b-roll", "texture", "detail", "macro", "abstract"],
    prompt: "Extreme macro close-up of a rich surface texture, side lighting raking across to reveal every micro-detail, shallow depth of field with only a thin plane in focus, the material fills the entire frame creating an abstract landscape — could be fabric weave, brushed metal, liquid surface, wood grain, or stone, warm amber or cool blue lighting depending on mood, cinematic 16:9 composition, no identifiable product or person, pure visual texture for editorial cutaway, 100mm macro f/4, film grain for analog warmth",
  },
  {
    id: "broll-pour-drip",
    name: "Liquid Pour / Drip",
    description: "Slow-motion style liquid pouring, dripping, or splashing",
    tags: ["b-roll", "liquid", "pour", "splash", "slow-motion"],
    prompt: "Frozen moment of liquid in motion — a pour, drip, or splash captured at high speed, glossy liquid surface catching dramatic side lighting, individual droplets suspended in air with perfect focus, deep dark background isolating the liquid form, translucent material showing light passing through, caustic light patterns on the surface below, cinematic lighting with a single strong directional source, 100mm macro f/2.8, hyper-detailed commercial beverage or cosmetic quality, no product visible — just the pure beauty of liquid dynamics",
  },
  {
    id: "broll-hands-action",
    name: "Hands in Action",
    description: "Close-up of hands performing a task — crafting, typing, cooking, applying",
    tags: ["b-roll", "hands", "action", "close-up", "craft"],
    prompt: "Cinematic close-up of hands performing an action — could be typing on a keyboard, kneading dough, applying skincare, arranging flowers, or crafting, warm natural side lighting illuminating the hands and the task, shallow depth of field isolating the hands from the environment, the background is a soft blur of the workspace, skin tones warm and natural with visible texture, the action frozen mid-movement suggesting graceful motion, 85mm f/1.8, cinematic 16:9 aspect, no face visible, just hands and their purposeful work",
  },
  {
    id: "broll-establishing",
    name: "Establishing / Environment Shot",
    description: "Wide environmental shot setting the scene — city, nature, interior",
    tags: ["b-roll", "establishing", "wide", "environment", "scene"],
    prompt: "Wide cinematic establishing shot of an environment — could be a city skyline at golden hour, a misty mountain landscape, a modern office lobby, or a cozy neighborhood street, dramatic natural lighting creating long shadows and warm tones, depth created through atmospheric perspective with haze or fog, no people in primary focus — they may be tiny figures adding scale, 24mm wide-angle lens capturing the full scope, cinematic 2.39:1 or 16:9 composition, this is the first frame that sets the world of the story, film-quality color grading",
  },
  {
    id: "broll-transition",
    name: "Abstract Transition Frame",
    description: "Abstract visual designed as a transition between scenes — light, motion, blur",
    tags: ["b-roll", "transition", "abstract", "motion", "light"],
    prompt: "Abstract transitional visual — could be light leaks streaming across the frame, motion blur of a moving scene, bokeh circles floating in darkness, or soft focus color fields shifting, designed to work as a visual bridge between two scenes, warm or cool depending on the transition mood, ethereal and non-representational, 16:9 cinematic composition, no identifiable subject — pure light and color and motion, soft film grain, the kind of frame you see between scenes in high-end brand films or documentaries",
  },
  {
    id: "broll-overhead-workspace",
    name: "Overhead Workspace / Process",
    description: "Top-down bird's eye view of a workspace or process in progress",
    tags: ["b-roll", "overhead", "workspace", "top-down", "process"],
    prompt: "Perfectly overhead top-down view of a workspace mid-process, tools and materials arranged with working chaos — not staged but naturally paused mid-task, soft even overhead lighting creating minimal shadows, the surface tells a story of work in progress — paint swatches, ingredients, fabric samples, code printouts, or design tools, muted color palette with pops of color from materials, 35mm lens shot from directly above, occupies the full frame edge to edge, documentary-style authenticity, no person visible — just their workspace evidence",
  },
  {
    id: "broll-product-ingredient",
    name: "Product Ingredients / Components",
    description: "Raw ingredients or components that make up a product — scattered artistically",
    tags: ["b-roll", "ingredients", "components", "scattered", "deconstructed"],
    prompt: "Artistically scattered raw ingredients or components of a product on a clean surface — herbs, minerals, extracts, mechanical parts, or fabric swatches depending on the product type, each element individually lit with soft directional light, slight overhead angle showing the collection, generous spacing between elements for a clean look, color palette derived from the actual materials, suggests quality and transparency about what goes into the product, 50mm f/4 for edge-to-edge sharpness, editorial still-life quality",
  },
  {
    id: "broll-time-atmosphere",
    name: "Time of Day / Atmosphere",
    description: "Purely atmospheric shot capturing a specific time and mood",
    tags: ["b-roll", "atmosphere", "mood", "time-of-day", "cinematic"],
    prompt: "Pure atmospheric frame capturing a specific moment in time — early morning mist, golden hour warmth, blue hour twilight, or late night neon glow, no subject or story — just the quality of light and air at that moment, volumetric rays or haze visible, rich tonal depth from deep shadows to bright highlights, the image evokes a feeling more than a subject, cinematic 16:9 composition with natural leading lines, 35mm f/2.0 lens, film-quality color grading that defines the time period, editorial or documentary interstitial quality",
  },
];

// Storyboard "templates" are NOT prescriptive frame prompts.
// They're just hints the user can browse in the UI for script structure ideas.
// The actual image prompts come from generateImagePrompt() per-chunk.
const STORYBOARD_TEMPLATES: ImageAgentTemplate[] = [
  {
    id: "storyboard-any",
    name: "Auto-Storyboard",
    description: "Paste any script — frames auto-generated from your sections",
    tags: ["storyboard", "auto", "flexible", "any-script"],
    prompt: "storyboard keyframe sequence from script",
  },
];

// ── Sub-Agent Registry ───────────────────────────────────────────────────────

export const IMAGE_SUB_AGENTS: ImageSubAgent[] = [
  {
    id: "product-ugc",
    name: "Product UGC Photographer",
    description: "Authentic yet polished UGC-style product photography",
    voice: "Warm, tactile, aspirational-but-accessible",
    defaultCamera: {
      lens: "50mm f/2.0",
      lighting: "Soft natural window light from the left",
      filmStock: "Clean digital, slight warmth",
      post: "Lifted blacks, gentle highlight roll-off, micro-contrast",
    },
    rules: {
      must: ["Specify product material/finish", "Include surface/background material", "Mention lighting direction", "Include authenticity marker"],
      mustNot: ["Product floating in void", "More than 3 props", "Neon/extreme grading", "Generate text on products"],
      defaults: { lighting: "soft natural window light", surface: "linen or light wood", dof: "f/2.0 - f/2.8", color: "slightly warm" },
    },
    skills: ["Surface & Material Rendering", "Scene Composition", "Prop Styling", "UGC Authenticity Markers"],
    templates: PRODUCT_UGC_TEMPLATES,
  },
  {
    id: "lifestyle",
    name: "Lifestyle Scene Director",
    description: "Aspirational yet relatable daily-life imagery",
    voice: "Calm, aspirational, sensory",
    defaultCamera: {
      lens: "35mm f/1.8",
      lighting: "Natural available light, golden hour or overcast",
      filmStock: "Portra 400 aesthetic",
      post: "Desaturated 10%, lifted blacks, film grain",
    },
    rules: {
      must: ["Establish time of day through lighting", "Include organic/natural element", "Describe spatial environment", "Include sensory language"],
      mustNot: ["Sterile or cold environments", "Overcrowded scenes", "Harsh artificial lighting", "Recognizable brand logos"],
      defaults: { timeOfDay: "Morning golden hour", environment: "Modern minimalist home", palette: "Warm neutrals, earth tones", mood: "Calm, aspirational" },
    },
    skills: ["Environmental Storytelling", "Mood Atmospherics", "Space & Interior Direction", "Human Presence (Implied)"],
    templates: LIFESTYLE_TEMPLATES,
  },
  {
    id: "food-beverage",
    name: "Food & Beverage Stylist",
    description: "Culinary photography that makes viewers taste with their eyes",
    voice: "Sensory, indulgent, precise",
    defaultCamera: {
      lens: "85mm f/2.0",
      lighting: "Side light from large window, white bounce card",
      filmStock: "Clean digital with warm undertone",
      post: "Micro-contrast boost, highlight recovery, warm shadows",
    },
    rules: {
      must: ["Use sensory texture words (2+ per prompt)", "Specify surface/background", "Describe lighting direction", "Include temperature cues"],
      mustNot: ["Blue-toned lighting", "Describe food as artificial", "Shoot from below", "Overcrowd a plate"],
      defaults: { angle: "45 degrees", surface: "Dark natural wood or slate", lighting: "Side window with bounce", garnish: "Fresh herbs or citrus" },
    },
    skills: ["Food Texture Language", "Beverage Physics", "Food Styling Composition", "Scene Dressing"],
    templates: FOOD_BEVERAGE_TEMPLATES,
  },
  {
    id: "fashion-beauty",
    name: "Fashion & Beauty Director",
    description: "High-fashion editorial bridging luxury magazines and social media",
    voice: "Polished, editorial, confident",
    defaultCamera: {
      lens: "85mm f/1.8",
      lighting: "Beauty dish key + large softbox fill",
      filmStock: "Clean fashion digital, accurate skin tones",
      post: "Skin retouching, color grading, highlight shimmer",
    },
    rules: {
      must: ["Describe skin lighting quality", "Specify dominant color story", "Include texture language for materials", "Reference light quality for beauty"],
      mustNot: ["Unflattering angles for beauty", "Unrealistic body proportions", "Cold/blue-only lighting on skin", "Neglect background complementing subject"],
      defaults: { lighting: "Soft beauty with editorial edge", skin: "Natural, healthy, dewy", background: "Complementary neutral", color: "Warm neutral with one accent" },
    },
    skills: ["Skin & Texture Rendering", "Color Story Mastery", "Fashion Composition", "Fashion Context"],
    templates: FASHION_BEAUTY_TEMPLATES,
  },
  {
    id: "tech-gadgets",
    name: "Tech Product Visualizer",
    description: "Sleek, aspirational technology product imagery",
    voice: "Clean, precise, futuristic",
    defaultCamera: {
      lens: "50mm f/2.8",
      lighting: "Controlled studio with rim light accent",
      filmStock: "Digital, high contrast, deep blacks",
      post: "High micro-contrast, deep blacks, slight blue-cool shift",
    },
    rules: {
      must: ["Describe device material finish", "Include rim/edge lighting", "Specify deep controlled blacks", "Include reflective/light-catching detail"],
      mustNot: ["Warm/amber dominant tone", "Messy cables or clutter", "Soft/organic surfaces", "Ignore screen state"],
      defaults: { background: "Dark gradient or clean desk", lighting: "Cool-neutral with warm accent", surface: "Matte dark desk or slate", shift: "Slight cool/blue undertone" },
    },
    skills: ["Material Surface Language", "Lighting for Tech", "Tech Composition", "Environment Context"],
    templates: TECH_GADGETS_TEMPLATES,
  },
  {
    id: "abstract-artistic",
    name: "Visual Artist",
    description: "Mesmerizing abstract and artistic digital imagery",
    voice: "Poetic, technical, experimental",
    defaultCamera: {
      lens: "Wide 24mm or macro 100mm",
      lighting: "Dramatic, unnatural, or baked into 3D scene",
      filmStock: "Clean digital, high detail, non-photographic",
      post: "Heavy grading, color manipulation, contrast extremes",
    },
    rules: {
      must: ["Define primary visual form", "Specify color strategy", "Include depth cues", "Push for originality"],
      mustNot: ["Generic colorful abstract background", "Mix more than 2 form languages", "Forget depth (no flat images)", "Default to rainbow"],
      defaults: { form: "Liquid/organic flow", color: "Deep darks with luminous accent", depth: "Atmospheric perspective with bokeh", quality: "8K hyper-detailed" },
    },
    skills: ["Abstract Form Language", "Material/Surface Invention", "3D Scene Construction", "Color Theory for Abstract"],
    templates: ABSTRACT_ARTISTIC_TEMPLATES,
  },
  {
    id: "social-media",
    name: "Social Content Creator",
    description: "Scroll-stopping imagery optimized for social platforms",
    voice: "Bold, platform-savvy, conversion-aware",
    defaultCamera: {
      lens: "N/A (graphic/designed content)",
      lighting: "Clean, bright, high contrast",
      filmStock: "Modern graphic design meets photography",
      post: "High saturation, sharp, mobile-optimized",
    },
    rules: {
      must: ["Mobile-first viewing", "Clear negative space for text", "High contrast", "Saturated colors for mobile screens"],
      mustNot: ["Complex compositions", "Low contrast or muddy colors", "Center all visual interest", "Generate text in image"],
      defaults: { contrast: "High", saturation: "+15% above natural", composition: "Clean with negative space", readability: "Must work at 150x150px" },
    },
    skills: ["Platform-Optimized Composition", "Text-Ready Backgrounds", "Engagement Psychology", "Content Type Patterns"],
    templates: SOCIAL_MEDIA_TEMPLATES,
  },
  {
    id: "brand-marketing",
    name: "Brand Campaign Director",
    description: "Premium hero imagery for product launches and campaigns",
    voice: "Premium, strategic, bold",
    defaultCamera: {
      lens: "70mm f/2.0",
      lighting: "Controlled studio or premium environmental",
      filmStock: "High-end digital, Phase One quality",
      post: "Commercial retouching, perfect gradients, controlled palette",
    },
    rules: {
      must: ["Product as visual hero", "Intentional space for ad copy", "Describe brand tone", "Commercial-quality lighting language"],
      mustNot: ["Props overpower product", "Cluttered compositions", "Amateur lighting descriptions", "Forget commercial purpose"],
      defaults: { placement: "Center or golden ratio", background: "Complementary, never distracting", lighting: "Controlled studio or premium natural", space: "30-40% negative space for copy" },
    },
    skills: ["Visual Hierarchy for Commerce", "Campaign World-Building", "Premium Composition", "Brand Tone Mapping"],
    templates: BRAND_MARKETING_TEMPLATES,
  },
  {
    id: "b-roll",
    name: "B-Roll Cinematographer",
    description: "Cinematic cutaway, insert, and filler shots — textures, environments, details, transitions",
    voice: "Cinematic, atmospheric, non-narrative — pure visual language",
    defaultCamera: {
      lens: "Varies — 100mm macro for details, 24mm for establishing, 85mm for hands",
      lighting: "Dramatic directional, natural atmospheric, or abstract light play",
      filmStock: "Cinematic digital with subtle film grain",
      post: "Heavy color grading, crushed blacks or lifted shadows depending on mood",
    },
    rules: {
      must: ["No primary human subject — hands okay, faces never the focus", "Pure visual storytelling through objects, textures, environments", "Cinematic 16:9 composition", "Strong lighting direction creating depth", "Each frame works as a standalone visual"],
      mustNot: ["People as the subject", "Product branding or text visible", "Busy or cluttered compositions", "Flat lighting", "Direct-to-camera angles"],
      defaults: { composition: "Cinematic 16:9", subject: "Environment, texture, or detail", lighting: "Dramatic single-source or natural atmospheric", style: "Documentary/editorial interstitial" },
    },
    skills: ["Texture & Material Cinematography", "Environmental Atmosphere", "Abstract Motion Suggestion", "Transitional Visual Design", "Ingredient Deconstruction"],
    templates: BROLL_TEMPLATES,
  },
  {
    id: "storyboard",
    name: "Storyboard Keyframe Artist",
    description: "Chunks scripts into sections, feeds each through the image pipeline for nano_banana keyframes",
    voice: "Cinematic, precise, shot-aware — but the image pipeline does the real prompt work",
    defaultCamera: {
      lens: "Determined by image pipeline per-chunk",
      lighting: "Determined by image pipeline per-chunk",
      filmStock: "Determined by image pipeline per-chunk",
      post: "Determined by image pipeline per-chunk",
    },
    rules: {
      must: ["Chunk script into sections", "Flow each chunk through generateImagePrompt()", "Prepend consistency anchors to each chunk", "16:9 aspect ratio for all keyframes"],
      mustNot: ["Build its own prompts — delegate to image pipeline", "Fix the frame count — let the script decide", "Override image pipeline template/style choices"],
      defaults: { aspectRatio: "16:9", model: "nano_banana_pro", style: "cinematic" },
    },
    skills: ["Script Chunking", "Consistency Anchor Detection", "Image Pipeline Orchestration"],
    templates: STORYBOARD_TEMPLATES,
  },
];

// ── Master Agent: Intent Classifier ──────────────────────────────────────────

export function classifyImageIntent(userPrompt: string): ImageClassification {
  const lower = userPrompt.toLowerCase();
  const scores: Record<ImageAgentCategory, number> = {
    "product-ugc": 0,
    "lifestyle": 0,
    "food-beverage": 0,
    "fashion-beauty": 0,
    "tech-gadgets": 0,
    "abstract-artistic": 0,
    "social-media": 0,
    "brand-marketing": 0,
    "b-roll": 0,
    "storyboard": 0,
  };

  // Score each category based on signal word matches
  for (const [category, signals] of Object.entries(ROUTING_SIGNALS)) {
    for (const signal of signals) {
      if (lower.includes(signal)) {
        scores[category as ImageAgentCategory] += 1;
      }
    }
  }

  // Normalize scores to 0-1
  const maxScore = Math.max(...Object.values(scores), 1);
  const normalized = Object.fromEntries(
    Object.entries(scores).map(([k, v]) => [k, v / maxScore])
  ) as Record<ImageAgentCategory, number>;

  // Find top category
  const sorted = Object.entries(normalized).sort(([, a], [, b]) => b - a);
  const [topCategory, topScore] = sorted[0] as [ImageAgentCategory, number];
  const [secondCategory] = sorted[1] as [ImageAgentCategory, number];

  // Detect mood
  const mood = detectMood(lower);

  // Detect complexity
  const wordCount = userPrompt.split(/\s+/).length;
  const complexity: "simple" | "standard" | "complex" =
    wordCount <= 5 ? "simple" : wordCount <= 20 ? "standard" : "complex";

  // Extract entities (capitalized words that aren't common)
  const entities = extractEntities(userPrompt);

  return {
    category: topCategory,
    confidence: topScore,
    mood,
    complexity,
    entities,
    secondaryCategory: topScore < 0.6 ? secondCategory : undefined,
  };
}

function detectMood(text: string): string {
  const moods: Record<string, string[]> = {
    luxurious: ["luxury", "premium", "elegant", "sophisticated", "opulent"],
    gritty: ["raw", "gritty", "urban", "street", "industrial"],
    playful: ["fun", "playful", "bright", "colorful", "pop"],
    clinical: ["clean", "medical", "clinical", "sterile", "white"],
    warm: ["warm", "cozy", "golden", "amber", "inviting"],
    editorial: ["editorial", "magazine", "vogue", "fashion", "high-end"],
    raw: ["authentic", "real", "candid", "honest", "unfiltered"],
  };

  for (const [mood, keywords] of Object.entries(moods)) {
    if (keywords.some((k) => text.includes(k))) return mood;
  }
  return "warm"; // sensible default
}

function extractEntities(text: string): string[] {
  const commonWords = new Set(["a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by", "from", "as", "is", "was", "are", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "can", "shall", "i", "you", "he", "she", "it", "we", "they", "my", "your", "his", "her", "its", "our", "their", "this", "that", "these", "those"]);
  return text
    .split(/\s+/)
    .filter((word) => word.length > 2 && /^[A-Z]/.test(word) && !commonWords.has(word.toLowerCase()))
    .map((w) => w.replace(/[.,!?;:]+$/, ""));
}

// ── Master Agent: Prompt Generator ───────────────────────────────────────────

export function generateImagePrompt(
  userPrompt: string,
  options: {
    style?: ImageStyle;
    aspectRatio?: string;
    templateId?: string;
    /** Internal prompting config — used by agents calling other agents */
    internal?: InternalPromptConfig;
  } = {}
): ImageGenerationPayload {
  const internalSteps: InternalPromptStep[] = [];
  let workingPrompt = userPrompt;

  // ══════════════════════════════════════════════════════════════════════════
  // INTERNAL PROMPTING CHAIN
  // Runs before classification. Each step enriches the prompt behind the
  // scenes without user interaction. This is how agents communicate
  // internally — the storyboard agent passes context, the user passes
  // product info, and it all gets woven into the prompt before the
  // pipeline even starts.
  // ══════════════════════════════════════════════════════════════════════════

  // Step 1: Inject product context if provided
  if (options.internal?.productContext) {
    workingPrompt = internalInjectProduct(workingPrompt, options.internal.productContext, internalSteps);
  }

  // Step 2: Apply storyboard context if this is being called by the storyboard agent
  if (options.internal?.storyboardContext) {
    const ctx = options.internal.storyboardContext;
    const storyPrefix = `Scene: ${ctx.environment}, Subject: ${ctx.character}, Color palette: ${ctx.palette}`;
    workingPrompt = `${storyPrefix}. ${workingPrompt}`;
    internalSteps.push({
      step: "storyboard-context",
      applied: `Injected storyboard consistency anchors: ${ctx.beatLabel} — ${ctx.environment}`,
    });
  }

  // Step 3: Force agent if specified (bypass classification)
  let classification = classifyImageIntent(workingPrompt);
  if (options.internal?.forceAgent) {
    classification = { ...classification, category: options.internal.forceAgent, confidence: 1 };
    internalSteps.push({
      step: "force-agent",
      applied: `Forced to agent: ${options.internal.forceAgent}`,
    });
  }

  const style = options.style || "photorealistic";

  // Get the sub-agent
  const agent = IMAGE_SUB_AGENTS.find((a) => a.id === classification.category)!;

  // Step 4: Auto-select template based on content signals
  let templatePrompt: string | undefined;
  let templateUsed: string | undefined;
  if (options.templateId) {
    // Explicit template requested — search across ALL agents
    let template = agent.templates.find((t) => t.id === options.templateId);
    if (!template) {
      // Template might belong to a different agent — search all
      for (const a of IMAGE_SUB_AGENTS) {
        template = a.templates.find((t) => t.id === options.templateId);
        if (template) break;
      }
    }
    if (template) {
      templatePrompt = template.prompt;
      templateUsed = template.id;
    }
  }

  // Step 5: Build the enhanced prompt (existing logic)
  let prompt: string;
  if (templatePrompt) {
    prompt = injectEntities(templatePrompt, workingPrompt, classification.entities);
  } else if (classification.complexity === "simple") {
    const bestTemplate = findBestTemplate(agent, workingPrompt);
    if (bestTemplate) {
      prompt = injectEntities(bestTemplate.prompt, workingPrompt, classification.entities);
      templateUsed = bestTemplate.id;
      internalSteps.push({
        step: "auto-template",
        applied: `Auto-matched template: ${bestTemplate.name} (${bestTemplate.id})`,
      });
    } else {
      prompt = expandSimplePrompt(workingPrompt, agent, style);
    }
  } else {
    prompt = enhancePrompt(workingPrompt, agent, style, classification);
  }

  // Step 6: Apply style modifier
  const styleModifier = STYLE_MODIFIERS[style];
  if (!prompt.toLowerCase().includes(style)) {
    prompt = `${prompt}, ${styleModifier}`;
  }

  // Step 7: Apply aspect ratio hints
  if (options.aspectRatio && ASPECT_RATIO_HINTS[options.aspectRatio]) {
    prompt = `${prompt}, ${ASPECT_RATIO_HINTS[options.aspectRatio]}`;
  }

  // Build negative prompt
  const negativePrompt = buildNegativePrompt(classification.category);

  // Enforce word ceiling (200 words)
  prompt = enforceWordCeiling(prompt, 200);

  return {
    prompt,
    negativePrompt,
    style,
    agentUsed: classification.category,
    templateUsed,
    confidence: classification.confidence,
    needsClarification: classification.confidence < 0.3 && classification.complexity === "simple",
    internalPrompts: internalSteps.length > 0 ? internalSteps : undefined,
  };
}

// ── Internal Prompting: Product Injection ────────────────────────────────────
// Weaves product details into the prompt naturally so the generated image
// includes the product without it feeling forced.

function internalInjectProduct(
  prompt: string,
  product: ProductContext,
  steps: InternalPromptStep[]
): string {
  const additions: string[] = [];

  if (product.product) {
    // If the prompt doesn't already mention the product, add it
    if (!prompt.toLowerCase().includes(product.product.toLowerCase())) {
      additions.push(`featuring ${product.product}`);
    }
  }

  if (product.brand) {
    additions.push(`by ${product.brand}`);
  }

  if (product.materials && product.materials.length > 0) {
    additions.push(`product material: ${product.materials.join(", ")}`);
  }

  if (product.colors && product.colors.length > 0) {
    additions.push(`product colors: ${product.colors.join(", ")}`);
  }

  if (additions.length > 0) {
    const injection = additions.join(", ");
    steps.push({
      step: "product-injection",
      applied: `Added product context: ${injection}`,
    });
    return `${prompt}, ${injection}`;
  }

  return prompt;
}

function findBestTemplate(agent: ImageSubAgent, userPrompt: string): ImageAgentTemplate | null {
  const lower = userPrompt.toLowerCase();
  let bestMatch: ImageAgentTemplate | null = null;
  let bestScore = 0;

  for (const template of agent.templates) {
    let score = 0;
    for (const tag of template.tags) {
      if (lower.includes(tag)) score += 2;
    }
    // Check template name words
    for (const word of template.name.toLowerCase().split(/\s+/)) {
      if (lower.includes(word) && word.length > 3) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = template;
    }
  }

  // If no good match, return the first template as a sensible default
  return bestMatch || agent.templates[0] || null;
}

function injectEntities(templatePrompt: string, userPrompt: string, entities: string[]): string {
  let result = templatePrompt;
  // If user mentions specific items, weave them into the template
  if (entities.length > 0) {
    const entityStr = entities.join(", ");
    result = result.replace(/product/i, entityStr);
  }
  // If user prompt has specific color/material mentions, append them
  const materialWords = ["gold", "silver", "marble", "wood", "glass", "matte", "glossy", "leather", "velvet", "ceramic", "concrete", "brass"];
  const foundMaterials = materialWords.filter((m) => userPrompt.toLowerCase().includes(m));
  if (foundMaterials.length > 0) {
    result += `, featuring ${foundMaterials.join(" and ")} materials`;
  }
  return result;
}

function expandSimplePrompt(userPrompt: string, agent: ImageSubAgent, style: ImageStyle): string {
  const camera = agent.defaultCamera;
  return `${userPrompt}, ${camera.lighting}, ${camera.filmStock}, ${camera.post}, ${STYLE_MODIFIERS[style]}`;
}

function enhancePrompt(
  userPrompt: string,
  agent: ImageSubAgent,
  _style: ImageStyle,
  classification: ImageClassification
): string {
  const camera = agent.defaultCamera;
  const parts: string[] = [userPrompt];

  // Add camera defaults if not already specified
  if (!userPrompt.toLowerCase().includes("mm") && !userPrompt.toLowerCase().includes("lens")) {
    parts.push(`shot on ${camera.lens}`);
  }
  if (!userPrompt.toLowerCase().includes("light")) {
    parts.push(camera.lighting);
  }

  // Add mood-appropriate enhancements
  const moodEnhancements: Record<string, string> = {
    luxurious: "premium quality, sophisticated atmosphere, refined details",
    gritty: "textured, raw edges, authentic imperfections, character",
    playful: "bright and dynamic, energetic composition, inviting colors",
    clinical: "precise, clean, controlled environment, sharp details",
    warm: "warm tones, inviting atmosphere, comfortable and natural",
    editorial: "magazine-quality, intentional composition, polished",
    raw: "unfiltered, genuine, natural imperfections, honest",
  };

  if (moodEnhancements[classification.mood]) {
    parts.push(moodEnhancements[classification.mood]);
  }

  return parts.join(", ");
}

function buildNegativePrompt(category: ImageAgentCategory): string {
  const categorySpecific = CATEGORY_NEGATIVES[category] || "";
  return categorySpecific ? `${BASE_NEGATIVES}, ${categorySpecific}` : BASE_NEGATIVES;
}

function enforceWordCeiling(prompt: string, maxWords: number): string {
  const words = prompt.split(/\s+/);
  if (words.length <= maxWords) return prompt;
  return words.slice(0, maxWords).join(" ");
}

// ── Public API ───────────────────────────────────────────────────────────────

/** Get all image sub-agents */
export function getImageAgents(): ImageSubAgent[] {
  return IMAGE_SUB_AGENTS;
}

/** Get a specific image sub-agent */
export function getImageAgent(category: ImageAgentCategory): ImageSubAgent | undefined {
  return IMAGE_SUB_AGENTS.find((a) => a.id === category);
}

/** Get all templates across all image agents */
export function getAllImageTemplates(): (ImageAgentTemplate & { category: ImageAgentCategory; agentName: string })[] {
  return IMAGE_SUB_AGENTS.flatMap((agent) =>
    agent.templates.map((t) => ({ ...t, category: agent.id, agentName: agent.name }))
  );
}

/** Get templates for a specific agent category */
export function getImageTemplates(category: ImageAgentCategory): ImageAgentTemplate[] {
  return IMAGE_SUB_AGENTS.find((a) => a.id === category)?.templates || [];
}

// ── Storyboard Agent: Script Chunker → Image Pipeline Flow-Through ───────────
//
// The storyboard agent does NOT build its own prompts. It:
//   1. Takes a user's script
//   2. Chunks it into sections (flexible count based on script length)
//   3. Detects consistency anchors (palette, environment, character)
//   4. Prefixes each chunk with consistency context
//   5. Feeds each chunk through generateImagePrompt() — the REAL image pipeline
//   6. Returns the array of ImageGenerationPayloads as keyframes
//
// This means every keyframe gets the full benefit of: agent classification,
// template matching, style modifiers, camera profiles, entity injection,
// negative prompts — all the intelligence that makes nano_banana images great.
// The storyboard agent just orchestrates the sequence.

// (unused, keeping for reference)
// const FOCAL_LENGTHS = ["24mm", "35mm", "50mm", "70mm", "85mm", "100mm"];

/**
 * Generate a storyboard by chunking a script and flowing each chunk
 * through the existing image generation pipeline (generateImagePrompt).
 *
 * Each chunk is prefixed with consistency anchors so the image pipeline
 * produces visually coherent frames across the sequence.
 *
 * The storyboard agent does NOT build its own prompts — it delegates to
 * the same pipeline that makes great nano_banana images. It just handles:
 * chunking, consistency, and sequencing.
 */
export function generateStoryboard(
  script: string,
  options: {
    style?: ImageStyle;
    palette?: string;
    environment?: string;
    character?: string;
    /** Product context to inject into every keyframe */
    productContext?: ProductContext;
  } = {}
): StoryboardPayload {
  // 1. Chunk the script into sections — flexible count based on the script
  const chunks = chunkScript(script);

  // 2. Detect consistency anchors from the full script
  const palette = options.palette || inferPalette(script);
  const environment = options.environment || inferEnvironment(script);
  const character = options.character || inferCharacter(script);

  // 3. For each chunk, use the INTERNAL PROMPTING system to pass context
  //    to generateImagePrompt(). No more manual prefix concatenation —
  //    the internal config handles storyboard context, product injection,
  //    and agent communication behind the scenes.
  const keyframes: StoryboardKeyframe[] = chunks.map((chunk, i) => {
    const consistencyPrefix = buildConsistencyPrefix({
      palette,
      environment,
      character,
      frameIndex: i,
      totalFrames: chunks.length,
    });

    // Use the internal prompting system — this is how the storyboard
    // agent communicates with the image agent internally
    const imagePayload = generateImagePrompt(chunk.content, {
      style: options.style || "cinematic",
      aspectRatio: "16:9",
      internal: {
        storyboardContext: {
          environment,
          character,
          palette,
          beatLabel: chunk.label,
        },
        productContext: options.productContext,
      },
    });

    return {
      index: i,
      beatLabel: chunk.label,
      beatContent: chunk.content,
      imagePayload,
      consistencyPrefix,
    };
  });

  return {
    keyframes,
    model: "nano_banana_pro",
    aspectRatio: "16:9",
    agentUsed: "storyboard",
    totalFrames: keyframes.length,
    consistency: { environment, character, palette },
  };
}

// ── Script Chunking ──────────────────────────────────────────────────────────

interface ScriptChunk {
  label: string;
  content: string;
}

/**
 * Chunk a script into sections. Handles multiple formats:
 * - Explicit markers: [HOOK] content [PROBLEM] content ...
 * - Numbered sections: 1. content 2. content ...
 * - Paragraphs: double newline separated blocks
 * - Sentences: falls back to grouping sentences for short scripts
 *
 * No fixed frame count — the script decides how many keyframes it needs.
 */
function chunkScript(script: string): ScriptChunk[] {
  // Try explicit section markers first: [HOOK], [STEP 1], [CTA], etc.
  const markerChunks = chunkByMarkers(script);
  if (markerChunks.length >= 2) return markerChunks;

  // Try numbered sections: "1." "2." etc.
  const numberedChunks = chunkByNumbering(script);
  if (numberedChunks.length >= 2) return numberedChunks;

  // Try paragraph breaks (double newline)
  const paragraphChunks = chunkByParagraphs(script);
  if (paragraphChunks.length >= 2) return paragraphChunks;

  // Fall back to sentence grouping
  return chunkBySentences(script);
}

function chunkByMarkers(script: string): ScriptChunk[] {
  const chunks: ScriptChunk[] = [];
  const regex = /\[([A-Z][A-Z0-9 _-]*)\][\s:]*([^\[]*)/g;
  let match;
  while ((match = regex.exec(script)) !== null) {
    const content = match[2].trim();
    if (content.length > 5) {
      chunks.push({ label: match[1].trim(), content });
    }
  }
  return chunks;
}

function chunkByNumbering(script: string): ScriptChunk[] {
  const chunks: ScriptChunk[] = [];
  const regex = /(?:^|\n)\s*(\d+)[.)]\s+([^\n]+)/g;
  let match;
  while ((match = regex.exec(script)) !== null) {
    const content = match[2].trim();
    if (content.length > 5) {
      chunks.push({ label: `SECTION ${match[1]}`, content });
    }
  }
  return chunks;
}

function chunkByParagraphs(script: string): ScriptChunk[] {
  const paragraphs = script
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 10);

  return paragraphs.map((content, i) => ({
    label: `BEAT ${i + 1}`,
    content,
  }));
}

function chunkBySentences(script: string): ScriptChunk[] {
  const sentences = script
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);

  if (sentences.length === 0) {
    return [{ label: "FRAME 1", content: script }];
  }

  // Group sentences so each chunk has enough substance (~15+ words).
  // No fixed frame count — the script length decides.
  const chunks: ScriptChunk[] = [];
  let currentWords: string[] = [];
  let currentSentences: string[] = [];

  for (const sentence of sentences) {
    currentSentences.push(sentence);
    currentWords.push(...sentence.split(/\s+/));

    if (currentWords.length >= 15) {
      chunks.push({
        label: `BEAT ${chunks.length + 1}`,
        content: currentSentences.join(". "),
      });
      currentWords = [];
      currentSentences = [];
    }
  }

  // Don't drop remaining sentences — add as final chunk
  if (currentSentences.length > 0) {
    chunks.push({
      label: `BEAT ${chunks.length + 1}`,
      content: currentSentences.join(". "),
    });
  }

  return chunks;
}

// ── Consistency Anchors ──────────────────────────────────────────────────────
//
// Detect scene-level properties from the full script. These get prepended
// to each chunk before it enters the image pipeline, so every keyframe
// inherits the same visual DNA.

function buildConsistencyPrefix(opts: {
  palette: string;
  environment: string;
  character: string;
  frameIndex: number;
  totalFrames: number;
}): string {
  const parts = [
    `Scene: ${opts.environment}`,
    `Subject: ${opts.character}`,
    `Color palette: ${opts.palette}`,
  ];

  if (opts.frameIndex === 0) {
    parts.push("wide establishing shot to set the scene");
  } else if (opts.frameIndex === opts.totalFrames - 1) {
    parts.push("closing frame, resolution");
  }

  return parts.join(", ");
}

function inferPalette(text: string): string {
  const lower = text.toLowerCase();
  if (/luxury|premium|gold|elegant/.test(lower)) return "deep blacks, warm gold, cream";
  if (/fresh|clean|natural|organic/.test(lower)) return "soft whites, sage green, natural wood";
  if (/tech|digital|modern|futur/.test(lower)) return "deep navy, cool gray, electric blue accent";
  if (/warm|cozy|comfort|home/.test(lower)) return "warm amber, terracotta, cream, soft brown";
  if (/bold|energy|vibrant|excit/.test(lower)) return "rich saturated tones, warm with pops of contrast";
  if (/dark|moody|noir|mystery/.test(lower)) return "deep shadows, desaturated cool tones, single warm accent";
  return "warm neutrals, consistent earth tones";
}

function inferEnvironment(text: string): string {
  const lower = text.toLowerCase();
  if (/kitchen|cook|food|recipe/.test(lower)) return "modern bright kitchen with natural materials";
  if (/bathroom|skincare|beauty|vanity/.test(lower)) return "clean modern bathroom with soft natural light";
  if (/office|work|desk|studio/.test(lower)) return "minimal modern workspace";
  if (/outdoor|garden|nature|park/.test(lower)) return "outdoor natural setting with soft light";
  if (/gym|fitness|workout/.test(lower)) return "clean modern gym or fitness space";
  if (/bedroom|morning|routine/.test(lower)) return "sunlit bedroom with warm morning light";
  if (/store|shop|retail/.test(lower)) return "clean retail environment with styled displays";
  return "modern lifestyle interior with natural window light";
}

function inferCharacter(text: string): string {
  const lower = text.toLowerCase();

  // Check for explicit person descriptions
  const personMatch = text.match(/(?:person|woman|man|girl|guy|creator|influencer|host)[^,.]*(?:with|wearing|in)[^,.]+/i);
  if (personMatch) {
    return `same person throughout — ${personMatch[0].trim()}`;
  }

  if (/unbox|review|tutorial|demo/.test(lower)) {
    return "same person throughout — a creator at their workspace, natural appearance, casual but styled clothing";
  }
  if (/testimonial|story|journey/.test(lower)) {
    return "same person throughout — natural appearance, relatable, warm expression, casual clothing";
  }

  return "same person throughout — natural appearance, warm skin tones, casual but styled clothing";
}
