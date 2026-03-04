/* ═══════════════════════════════════════════════════════════════════════════════
   INFINITEUGC — STATE-OF-THE-ART PROMPT ENGINEERING LIBRARY
   ═══════════════════════════════════════════════════════════════════════════════
   Three AI generation systems:
   1. Image Generation  — cinematic prompt templates + smart enhancement
   2. Script Generation — platform-aware viral UGC scriptwriting
   3. Hook Generation   — already handled by backend pipeline
   ═══════════════════════════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────────────────────────────
   IMAGE GENERATION — PROMPT TEMPLATES & ENHANCEMENT
   ───────────────────────────────────────────────────────────────────────────── */

export interface ImagePromptTemplate {
  id: string;
  name: string;
  category: ImageCategory;
  description: string;
  basePrompt: string;
  /** Tags to display on the UI chip */
  tags: string[];
}

export type ImageCategory =
  | "ugc_product"
  | "lifestyle"
  | "food_beverage"
  | "fashion_beauty"
  | "tech_gadgets"
  | "abstract_artistic"
  | "social_media"
  | "brand_marketing";

export const IMAGE_CATEGORIES: { value: ImageCategory; label: string; icon: string }[] = [
  { value: "ugc_product", label: "UGC Product", icon: "📦" },
  { value: "lifestyle", label: "Lifestyle", icon: "🏡" },
  { value: "food_beverage", label: "Food & Drink", icon: "🍵" },
  { value: "fashion_beauty", label: "Fashion & Beauty", icon: "💄" },
  { value: "tech_gadgets", label: "Tech & Gadgets", icon: "📱" },
  { value: "abstract_artistic", label: "Abstract & Art", icon: "🎨" },
  { value: "social_media", label: "Social Media", icon: "📸" },
  { value: "brand_marketing", label: "Brand & Marketing", icon: "🏷️" },
];

export type ImageStyle =
  | "photorealistic"
  | "cinematic"
  | "editorial"
  | "minimal"
  | "vibrant"
  | "moody"
  | "soft_dreamy"
  | "raw_authentic";

export const IMAGE_STYLES: { value: ImageStyle; label: string; suffix: string }[] = [
  {
    value: "photorealistic",
    label: "Photorealistic",
    suffix: "photorealistic, hyper-detailed, shot on Sony A7R V with 85mm f/1.4 GM lens, natural lighting, subtle film grain, shallow depth of field with creamy bokeh, 8K resolution",
  },
  {
    value: "cinematic",
    label: "Cinematic",
    suffix: "cinematic color grading, anamorphic lens flare, 2.39:1 framing reference, volumetric fog, dramatic chiaroscuro lighting, film stock texture, Arri Alexa look, directed by Roger Deakins",
  },
  {
    value: "editorial",
    label: "Editorial",
    suffix: "high-end editorial photography, Vogue-quality composition, intentional negative space, refined color palette, studio lighting with large octabox, retouched skin, luxury magazine aesthetic",
  },
  {
    value: "minimal",
    label: "Minimal Clean",
    suffix: "minimalist aesthetic, clean negative space, soft even lighting, muted earth tone palette, geometric composition, Scandinavian design influence, high-key studio environment",
  },
  {
    value: "vibrant",
    label: "Bold & Vibrant",
    suffix: "bold saturated colors, high contrast, dynamic composition, energetic visual flow, complementary color theory, punchy processing, Y2K/maximalist inspiration",
  },
  {
    value: "moody",
    label: "Dark & Moody",
    suffix: "dark moody atmosphere, low-key lighting, deep shadows with selective highlights, desaturated cold tones, grain texture, dramatic tension, noir-inspired grading",
  },
  {
    value: "soft_dreamy",
    label: "Soft & Dreamy",
    suffix: "soft ethereal glow, diffused golden-hour lighting, pastel color harmony, gentle lens bloom, organic film halation, whimsical and serene mood, shot through vintage glass filter",
  },
  {
    value: "raw_authentic",
    label: "Raw UGC",
    suffix: "authentic iPhone photo aesthetic, slightly imperfect framing, natural mixed lighting, genuine unpolished feel, real-world environment, candid capture moment, VSCO preset look",
  },
];

/**
 * 48 curated prompt templates organized by category.
 * Each template is a complete prompt ready to generate with,
 * crafted with professional photography/art direction language.
 */
export const IMAGE_PROMPT_TEMPLATES: ImagePromptTemplate[] = [
  // ── UGC PRODUCT ──
  {
    id: "ugc_flatlay",
    name: "UGC Flatlay",
    category: "ugc_product",
    description: "Authentic overhead product layout on textured surface",
    basePrompt:
      "Overhead flatlay arrangement of a product surrounded by complementary lifestyle props on a linen textured surface, soft window light from the left casting gentle shadows, slightly messy authentic feel as if arranged by a real person — not a studio stylist, iPhone 15 Pro photo quality, warm neutral tones, subtle depth-of-field on edges",
    tags: ["flatlay", "overhead", "authentic"],
  },
  {
    id: "ugc_hand_hold",
    name: "Hand-Held Product",
    category: "ugc_product",
    description: "Close-up of a hand holding and presenting a product",
    basePrompt:
      "Close-up of a natural manicured hand elegantly presenting a product at eye level, soft bokeh background of a bright modern kitchen, warm golden-hour sidelight wrapping around fingers, visible skin texture and natural tones, product label facing camera with perfect readability, authentic UGC selfie-style perspective, shallow depth of field, slightly warm white balance",
    tags: ["hand-held", "close-up", "golden hour"],
  },
  {
    id: "ugc_unboxing",
    name: "Unboxing Moment",
    category: "ugc_product",
    description: "Pristine unboxing scene with tissue paper and excitement",
    basePrompt:
      "Top-down unboxing moment with hands pulling a product from a premium matte-finish box, tissue paper and eco-confetti spilling outward, marble countertop surface, soft diffused overhead light creating clean shadows, the reveal caught mid-motion with slight blur on fingers, genuine excitement energy, Instagram-ready framing, crisp product detail",
    tags: ["unboxing", "reveal", "premium"],
  },
  {
    id: "ugc_bathroom_shelf",
    name: "Bathroom Shelfie",
    category: "ugc_product",
    description: "Product sitting naturally on a bathroom shelf",
    basePrompt:
      "A skincare or wellness product sitting naturally on a bright white bathroom shelf alongside plants and everyday items, morning light streaming through a frosted window, condensation droplets visible on cool surfaces, clean minimalist Scandinavian bathroom interior, slightly shallow depth of field, fresh and clean mood, authentic lifestyle photography",
    tags: ["bathroom", "lifestyle", "shelf"],
  },
  {
    id: "ugc_desk_setup",
    name: "Desk Setup Shot",
    category: "ugc_product",
    description: "Product on a curated desk setup",
    basePrompt:
      "A tech or wellness product placed naturally on a minimalist desk setup, MacBook in the background, a warm desk lamp casting golden light across the surface, coffee cup slightly out of focus, desktop plant, cable management visible, genuine workspace environment, overhead slight angle at 30 degrees, cozy productive atmosphere, natural indoor lighting",
    tags: ["desk", "tech", "workspace"],
  },
  {
    id: "ugc_morning_routine",
    name: "Morning Routine",
    category: "ugc_product",
    description: "Product as part of a morning routine setup",
    basePrompt:
      "Morning routine scene with a product placed on a nightstand alongside a glass of water and a journal, soft dawn light filtering through sheer curtains, rumpled white linen bed sheets in background, shallow depth of field, warm amber tones, peaceful and intimate atmosphere, shot from bed-level perspective, authentic bedroom interior",
    tags: ["morning", "routine", "intimate"],
  },

  // ── LIFESTYLE ──
  {
    id: "life_golden_hour",
    name: "Golden Hour Living",
    category: "lifestyle",
    description: "Warm interior bathed in golden sunset light",
    basePrompt:
      "A beautifully styled modern living room interior bathed in rich golden-hour sunlight streaming through floor-to-ceiling windows, long warm shadows across hardwood floors, a steaming cup of coffee on a side table, indoor plants catching the light with translucent leaves, dust particles floating in sunbeams, warm and inviting atmosphere, architectural photography with lifestyle warmth",
    tags: ["golden hour", "interior", "warm"],
  },
  {
    id: "life_cozy_nook",
    name: "Cozy Reading Nook",
    category: "lifestyle",
    description: "Intimate cozy corner with soft textures",
    basePrompt:
      "An intimate reading nook with a deep velvet armchair, a chunky knit blanket draped casually, a stack of books with a coffee cup, soft ambient lamp light creating pools of warm glow, rain visible through a nearby window, plush textures everywhere, hygge atmosphere, indoor lifestyle photography with rich earth tones and gentle shadows",
    tags: ["cozy", "reading", "hygge"],
  },
  {
    id: "life_outdoor_cafe",
    name: "Outdoor Café Moment",
    category: "lifestyle",
    description: "Aesthetic café table with dappled sunlight",
    basePrompt:
      "An aesthetic outdoor café table with a perfectly crafted latte in a ceramic cup, a croissant on a stone plate, dappled sunlight filtering through leafy trees, European cobblestone street blurred in the soft background, morning breeze visible in a slightly fluttering napkin, candid lifestyle feel, rich warm tones with teal shadow accents, shallow depth of field",
    tags: ["café", "outdoor", "European"],
  },
  {
    id: "life_wellness_space",
    name: "Wellness Sanctuary",
    category: "lifestyle",
    description: "Serene wellness and self-care environment",
    basePrompt:
      "A serene wellness space with a rolled yoga mat, a jade roller, candles with a soft flame, a small indoor fountain, eucalyptus branches in a ceramic vase, soft neutral palette with sage green accents, diffused overhead light, zen minimalist interior, steam rising gently from a cup of herbal tea, peaceful and restorative mood",
    tags: ["wellness", "zen", "self-care"],
  },

  // ── FOOD & BEVERAGE ──
  {
    id: "food_hero_shot",
    name: "Food Hero Shot",
    category: "food_beverage",
    description: "Magazine-quality food photography",
    basePrompt:
      "Stunning hero shot of a beautifully plated dish on a handcrafted ceramic plate, fresh herbs as micro-garnish, intentional sauce drizzle creating organic lines, rustic wooden table surface, dramatic single-source side lighting creating deep appetizing shadows, steam rising from the hot dish, shallow depth of field with sharp detail on the focal point, Bon Appétit magazine quality",
    tags: ["hero shot", "plating", "magazine"],
  },
  {
    id: "food_pour_action",
    name: "Liquid Pour Action",
    category: "food_beverage",
    description: "Frozen moment of liquid being poured",
    basePrompt:
      "A dramatic frozen-in-time action shot of golden honey being poured from a wooden dipper into a ceramic bowl, thick viscous strands stretching with perfect clarity, splashing droplets suspended mid-air, dark moody background with a single warm spotlight, hyper-detailed texture on the honey surface, high-speed photography look, rich amber and deep brown tones",
    tags: ["pour", "action", "frozen"],
  },
  {
    id: "food_smoothie_bowl",
    name: "Smoothie Bowl Art",
    category: "food_beverage",
    description: "Colorful Instagram smoothie bowl overhead",
    basePrompt:
      "Stunning overhead shot of a vibrant acai smoothie bowl with precisely arranged toppings — granola clusters, sliced mango fan, blueberries, chia seeds, coconut flakes, and an edible flower — in a handmade ceramic bowl on a light marble surface, soft diffused natural light, pastel and jewel-tone color harmony, Instagram viral aesthetic, crisp focus across entire surface",
    tags: ["smoothie bowl", "colorful", "overhead"],
  },
  {
    id: "food_coffee_art",
    name: "Artisan Coffee",
    category: "food_beverage",
    description: "Specialty coffee with beautiful latte art",
    basePrompt:
      "Close-up of a perfectly poured latte art rosetta in a wide ceramic cup, steam wisps rising from the surface, coffee beans scattered artfully on a dark slate surface, warm side lighting with soft shadows, the barista's hand just visible at the edge pulling away, café counter blurred in background with bokeh, rich brown and cream tones, the detail of each micro-foam bubble visible",
    tags: ["coffee", "latte art", "artisan"],
  },
  {
    id: "food_cocktail_elegant",
    name: "Craft Cocktail",
    category: "food_beverage",
    description: "Elegantly styled cocktail with garnish",
    basePrompt:
      "A sophisticated craft cocktail in a crystal coupe glass with a perfect citrus twist garnish, condensation drops on the glass surface, backlit by a warm amber bar glow, dark luxurious bar environment with blurred bottles, a single reflected light creating a star on the glass rim, rich jewel tones in the liquid, moody editorial bar photography",
    tags: ["cocktail", "bar", "elegant"],
  },

  // ── FASHION & BEAUTY ──
  {
    id: "beauty_product_splash",
    name: "Beauty Product Splash",
    category: "fashion_beauty",
    description: "Luxury beauty product with dynamic liquid splash",
    basePrompt:
      "A luxury skincare bottle suspended in mid-air with a dynamic splash of creamy lotion or serum forming an elegant arc around it, clean white background with subtle gradient, the liquid caught mid-splash with hyper-detailed texture showing every droplet, the product label crisp and centered, high-end beauty advertising campaign aesthetic, studio strobe frozen action",
    tags: ["splash", "luxury", "beauty"],
  },
  {
    id: "beauty_vanity_flat",
    name: "Vanity Flatlay",
    category: "fashion_beauty",
    description: "Curated beauty products on a luxury vanity surface",
    basePrompt:
      "Luxurious overhead flatlay of curated beauty products arranged on a marble vanity tray — lipsticks, a compact mirror, a perfume bottle, and fresh roses — with soft diffused lighting creating minimal shadows, gold and blush pink color palette, each item placed with editorial precision yet slightly organic spacing, Vogue beauty editorial aesthetic, clean and sophisticated",
    tags: ["vanity", "luxury", "editorial"],
  },
  {
    id: "beauty_texture_swatch",
    name: "Texture Swatch",
    category: "fashion_beauty",
    description: "Close-up of beauty product texture and consistency",
    basePrompt:
      "Extreme macro close-up of a beauty product swatch — thick creamy moisturizer or glossy serum — on a smooth stone or glass surface, showing the luxurious texture, viscosity, and sheen in extraordinary detail, soft ring-light reflection visible on the surface, clean clinical background with a touch of warmth, the texture looks touchable and premium, skincare ingredient hero shot aesthetic",
    tags: ["texture", "macro", "swatch"],
  },
  {
    id: "fashion_flatlay_ootd",
    name: "OOTD Flatlay",
    category: "fashion_beauty",
    description: "Outfit of the day flatlay arrangement",
    basePrompt:
      "Curated outfit-of-the-day flatlay on a clean white wooden surface — folded premium knit sweater, crisp denim, leather watch, minimalist sneakers, and sunglasses — each item placed with intentional spacing, soft overhead natural light, neutral and earth-tone palette, the fabrics showing rich texture detail, lifestyle fashion blog aesthetic, slightly warm processing",
    tags: ["OOTD", "flatlay", "fashion"],
  },

  // ── TECH & GADGETS ──
  {
    id: "tech_hero_device",
    name: "Device Hero Shot",
    category: "tech_gadgets",
    description: "Premium tech product on dark reflective surface",
    basePrompt:
      "A sleek flagship smartphone or tech device floating at a slight angle above a dark reflective surface, edge lighting revealing the premium materials and finish, subtle blue and violet light accents creating a futuristic atmosphere, the screen displaying a clean UI, small light reflections on the glass, dark background with gradient, Apple keynote-level product photography",
    tags: ["hero", "tech", "premium"],
  },
  {
    id: "tech_workspace_setup",
    name: "Creator Workspace",
    category: "tech_gadgets",
    description: "Aesthetic tech workspace with multiple devices",
    basePrompt:
      "A premium creator desk setup shot from above at a 45-degree angle — ultra-wide monitor displaying creative software, mechanical keyboard with subtle RGB, a drawing tablet, AirPods case, a phone on a wireless charger — desk lamp casting warm directional light, dark walnut desk surface, cable management perfection, tech minimalism, warm yet modern palette",
    tags: ["workspace", "setup", "creator"],
  },
  {
    id: "tech_wearable_lifestyle",
    name: "Wearable in Action",
    category: "tech_gadgets",
    description: "Smartwatch or wearable in a lifestyle context",
    basePrompt:
      "A close-up of a wrist wearing a sleek smartwatch during a morning jog, the screen showing fitness metrics, shallow depth of field with a blurred park path background, early morning golden light catching the watch face, visible skin texture and a slight sheen of sweat, dynamic and health-conscious mood, authentic lifestyle tech photography with slight motion suggestion",
    tags: ["wearable", "fitness", "lifestyle"],
  },

  // ── ABSTRACT & ARTISTIC ──
  {
    id: "art_liquid_marble",
    name: "Liquid Marble",
    category: "abstract_artistic",
    description: "Swirling liquid marble in bold colors",
    basePrompt:
      "Abstract liquid marble art with deep navy blue, molten gold, and ivory white swirling together in organic flowing patterns, the metallic gold catching light with realistic reflective sheen, visible surface tension and fine detail veins throughout, dark luxurious background, the paint appearing thick and three-dimensional, hyper-detailed macro photography of acrylic pour art, 8K resolution",
    tags: ["marble", "abstract", "gold"],
  },
  {
    id: "art_gradient_mesh",
    name: "Gradient Mesh",
    category: "abstract_artistic",
    description: "Smooth aurora-like gradient for backgrounds",
    basePrompt:
      "Ultra-smooth holographic gradient mesh flowing in soft organic shapes, transitioning from deep midnight purple through electric blue to soft coral and warm amber, with subtle grain texture overlay, perfectly smooth color transitions with no banding, aurora borealis energy, suitable as a premium app background or brand visual, 8K resolution, clean and modern",
    tags: ["gradient", "holographic", "smooth"],
  },
  {
    id: "art_geometric_nature",
    name: "Sacred Geometry",
    category: "abstract_artistic",
    description: "Nature meets geometric sacred patterns",
    basePrompt:
      "Sacred geometry patterns emerging from natural organic forms — flower petals forming the Flower of Life, water droplets arranged in Fibonacci spirals, tree roots following golden ratio curves — merging mathematics with the beauty of nature, warm earth tones with gold geometric overlay, ethereal light rays, mystical yet scientific mood, fine detailed illustration quality",
    tags: ["geometry", "nature", "mystical"],
  },
  {
    id: "art_3d_objects",
    name: "Floating 3D Primitives",
    category: "abstract_artistic",
    description: "3D geometric objects floating in soft space",
    basePrompt:
      "Soft 3D geometric primitives — spheres, toruses, and rounded cubes — floating in a dreamy pastel gradient space, subsurface scattering making them appear like frosted glass or mochi, soft studio lighting with gentle colored shadows, minimal composition, the objects catching light with realistic specular highlights, cinema 4D octane render quality, satisfying and tactile aesthetic",
    tags: ["3D", "pastel", "floating"],
  },

  // ── SOCIAL MEDIA ──
  {
    id: "social_quote_card",
    name: "Quote Card Background",
    category: "social_media",
    description: "Beautiful background for Instagram quote overlays",
    basePrompt:
      "A beautiful atmospheric background image perfect for text overlay — soft neutral gradient with subtle organic bokeh light spots, gentle texture of handmade paper or fabric, warm and inviting tones of cream, dusty rose, and sage, enough negative space in the center for quote text, slightly out of focus foreground elements like dried flowers or leaves, Instagram story aesthetic",
    tags: ["quote", "background", "overlay"],
  },
  {
    id: "social_testimonial_bg",
    name: "Testimonial Background",
    category: "social_media",
    description: "Professional background for review/testimonial graphics",
    basePrompt:
      "A clean professional background for customer testimonial graphics — soft gradient moving from warm white to subtle blush pink, abstract soft bokeh circles in the background, a gentle paper or fabric texture, large open area for text placement, subtle gold foil confetti elements scattered at the edges, warm and trustworthy corporate-but-human feel, high resolution",
    tags: ["testimonial", "background", "professional"],
  },
  {
    id: "social_before_after",
    name: "Before/After Template",
    category: "social_media",
    description: "Split scene for before/after transformations",
    basePrompt:
      "A visually striking split-composition image — left side shows a dim, cluttered, uninspiring version of a space or scene with cool desaturated tones, right side shows the same scene transformed into a bright, organized, beautiful version with warm golden light, the division line is a clean vertical with slight glow, the contrast between the two halves is dramatic and satisfying",
    tags: ["before/after", "split", "transformation"],
  },

  // ── BRAND & MARKETING ──
  {
    id: "brand_packaging_mockup",
    name: "Packaging Hero",
    category: "brand_marketing",
    description: "Premium packaging in a styled environment",
    basePrompt:
      "A premium product package sitting hero-style in a carefully curated brand environment — the packaging is clean and minimal with matte finish, surrounded by raw ingredients or textures that represent the brand (dried flowers, raw crystals, citrus slices), directional studio light creating one dominant shadow, brand-elevating background in complementary neutral tones, commercial product photography for D2C brands",
    tags: ["packaging", "brand", "hero"],
  },
  {
    id: "brand_lifestyle_ad",
    name: "Lifestyle Ad Scene",
    category: "brand_marketing",
    description: "Product seamlessly integrated into a lifestyle scene",
    basePrompt:
      "An aspirational lifestyle advertising scene with a product naturally integrated — a person's hand reaching for it on a beautiful surface, surrounding environment tells a story (morning kitchen, gym bag, travel scene), natural lighting that feels unforced, the product is the clear focal point but doesn't feel staged, authentic aspirational brand photography, color palette aligned with modern D2C brands",
    tags: ["ad", "lifestyle", "aspirational"],
  },
  {
    id: "brand_hero_minimal",
    name: "Minimal Brand Hero",
    category: "brand_marketing",
    description: "Clean product-forward hero with lots of negative space",
    basePrompt:
      "Ultra-clean product hero shot on a seamless gradient background — the product casting a soft natural shadow, surrounded by expansive negative space for headline copy, soft diffused studio lighting from above and slightly behind, the product material and texture rendered with photographic precision, minimal and elevated, ready for a homepage hero or paid ad creative, high-end direct-to-consumer aesthetic",
    tags: ["minimal", "hero", "negative space"],
  },
  {
    id: "brand_ingredients_spread",
    name: "Ingredient Spread",
    category: "brand_marketing",
    description: "Raw ingredients arranged around the product",
    basePrompt:
      "An artful top-down arrangement of raw natural ingredients — honey, lavender sprigs, oat clusters, citrus slices, aloe leaves — radiating outward from a central product, each ingredient lit to show its natural texture and color, light linen or marble surface, soft even overhead lighting, the composition feels abundant and natural, clean supplement or skincare brand marketing aesthetic",
    tags: ["ingredients", "natural", "spread"],
  },
];

/**
 * Enhances a basic user prompt into a professional-grade image generation prompt.
 * Combines the user's intent with selected style modifiers and quality enhancers.
 */
export function enhanceImagePrompt(
  userPrompt: string,
  style: ImageStyle = "photorealistic",
  options?: {
    negativePrompt?: boolean;
    enhanceDetail?: boolean;
    enhanceComposition?: boolean;
  }
): { prompt: string; negativePrompt?: string } {
  const styleData = IMAGE_STYLES.find((s) => s.value === style);
  const styleSuffix = styleData?.suffix || "";

  // Quality amplifiers that ensure the AI model produces the highest fidelity
  const qualityBoost = [
    "masterpiece quality",
    "extremely detailed",
    "professional composition",
    "perfect exposure",
  ].join(", ");

  // Composition enhancers
  const compositionBoost = options?.enhanceComposition
    ? ", rule of thirds placement, intentional visual hierarchy, eye-leading lines, balanced weight distribution"
    : "";

  // Detail enhancers
  const detailBoost = options?.enhanceDetail
    ? ", micro-detail rendering, visible material textures, sub-surface skin detail, environmental storytelling through small props"
    : "";

  const enhanced = `${userPrompt.trim()}, ${styleSuffix}, ${qualityBoost}${compositionBoost}${detailBoost}`;

  const result: { prompt: string; negativePrompt?: string } = {
    prompt: enhanced,
  };

  if (options?.negativePrompt) {
    result.negativePrompt =
      "blurry, low resolution, watermark, signature, text overlay, deformed, distorted, disfigured, bad anatomy, bad proportions, extra limbs, cloned face, gross proportions, malformed limbs, missing arms, missing legs, extra arms, extra legs, fused fingers, too many fingers, long neck, username, error, JPEG artifacts, low quality, worst quality, normal quality, lowres, bad hands, cropped, poorly drawn";
  }

  return result;
}


/* ─────────────────────────────────────────────────────────────────────────────
   SCRIPT GENERATION — VIRAL UGC SCRIPTWRITING ENGINE
   ───────────────────────────────────────────────────────────────────────────── */

export type ScriptTone =
  | "conversational"
  | "professional"
  | "energetic"
  | "humorous"
  | "inspirational"
  | "urgent"
  | "empathetic"
  | "authoritative";

export type ScriptFormat =
  | "ugc_ad"
  | "product_demo"
  | "testimonial"
  | "how_to"
  | "hook_cta"
  | "story_driven"
  | "problem_solution"
  | "trend_hijack"
  | "comparison"
  | "behind_the_scenes";

export type ScriptPlatform =
  | "tiktok"
  | "instagram_reels"
  | "youtube_shorts"
  | "facebook"
  | "universal";

export type TargetAudience =
  | "gen_z"
  | "millennials"
  | "gen_x"
  | "parents"
  | "entrepreneurs"
  | "fitness"
  | "beauty"
  | "tech_savvy"
  | "broad";

export const SCRIPT_TONES: { value: ScriptTone; label: string; description: string }[] = [
  { value: "conversational", label: "Conversational", description: "Casual, like talking to a friend" },
  { value: "professional", label: "Professional", description: "Polished and credible" },
  { value: "energetic", label: "Energetic", description: "High energy, excited delivery" },
  { value: "humorous", label: "Humorous", description: "Witty with comedic timing" },
  { value: "inspirational", label: "Inspirational", description: "Motivating and uplifting" },
  { value: "urgent", label: "Urgent", description: "Time-sensitive FOMO" },
  { value: "empathetic", label: "Empathetic", description: "Understanding their pain points" },
  { value: "authoritative", label: "Authoritative", description: "Expert positioning" },
];

export const SCRIPT_FORMATS: { value: ScriptFormat; label: string; description: string }[] = [
  { value: "ugc_ad", label: "UGC Ad", description: "Classic direct-to-camera ad" },
  { value: "product_demo", label: "Product Demo", description: "Show the product in action" },
  { value: "testimonial", label: "Testimonial", description: "Personal experience story" },
  { value: "how_to", label: "How-To", description: "Step-by-step tutorial format" },
  { value: "hook_cta", label: "Hook → CTA", description: "Punchy open + hard close" },
  { value: "story_driven", label: "Story-Driven", description: "Narrative arc structure" },
  { value: "problem_solution", label: "Problem → Solution", description: "Pain point then fix" },
  { value: "trend_hijack", label: "Trend Hijack", description: "Ride a trending format" },
  { value: "comparison", label: "This vs That", description: "Before/after comparison" },
  { value: "behind_the_scenes", label: "Behind the Scenes", description: "Authentic BTS content" },
];

export const SCRIPT_PLATFORMS: { value: ScriptPlatform; label: string; maxDuration: number }[] = [
  { value: "tiktok", label: "TikTok", maxDuration: 180 },
  { value: "instagram_reels", label: "Instagram Reels", maxDuration: 90 },
  { value: "youtube_shorts", label: "YouTube Shorts", maxDuration: 60 },
  { value: "facebook", label: "Facebook", maxDuration: 120 },
  { value: "universal", label: "Universal", maxDuration: 90 },
];

export const TARGET_AUDIENCES: { value: TargetAudience; label: string }[] = [
  { value: "gen_z", label: "Gen Z (18-25)" },
  { value: "millennials", label: "Millennials (26-40)" },
  { value: "gen_x", label: "Gen X (41-56)" },
  { value: "parents", label: "Parents" },
  { value: "entrepreneurs", label: "Entrepreneurs" },
  { value: "fitness", label: "Fitness Enthusiasts" },
  { value: "beauty", label: "Beauty & Skincare" },
  { value: "tech_savvy", label: "Tech-Savvy" },
  { value: "broad", label: "Broad Audience" },
];

/**
 * 30 viral hook patterns used by the top UGC creators.
 * Each is a tested attention-grabbing opener structure.
 */
export const VIRAL_HOOK_PATTERNS: string[] = [
  "Stop scrolling if you {PAIN_POINT}",
  "POV: You just discovered {PRODUCT}",
  "I need to talk about this because nobody is saying it",
  "Okay but why did nobody tell me about this sooner?",
  "The {INDUSTRY} industry doesn't want you to know this",
  "I was today years old when I found out about {PRODUCT}",
  "Tell me why this $XX product works better than {EXPENSIVE_ALTERNATIVE}",
  "This is your sign to finally {DESIRED_OUTCOME}",
  "Wait... you're still {OLD_WAY}? Let me change your life",
  "Things that just make sense: {PRODUCT_BENEFIT}",
  "Unpopular opinion: {CONTRARIAN_TAKE}",
  "If you're still struggling with {PROBLEM}, watch this",
  "I tested every {CATEGORY} on the market. Here's the winner.",
  "My honest review after {TIME_PERIOD} of using {PRODUCT}",
  "3 things I wish I knew before {RELEVANT_EVENT}",
  "{PRODUCT} was NOT on my bingo card this year",
  "Can we talk about how {PRODUCT} literally {TRANSFORMATION}?",
  "I'm not gatekeeping this anymore",
  "The ONE thing that fixed my {PROBLEM} after years of trying",
  "You need this if you're a {TARGET_PERSONA}",
  "Watch me {ACTION} in {SHORT_TIME} with this",
  "Wait for the before and after... 👀",
  "This might be the most {SUPERLATIVE} thing I've ever tried",
  "I can't believe {PRODUCT} actually did this",
  "Run don't walk — this is selling out SO fast",
  "Everything I use for {ROUTINE}: a thread",
  "Here's why everyone's switching to {PRODUCT}",
  "I've been using this for {TIME} and the results are insane",
  "If {PRODUCT} doesn't work, I'll delete this video",
  "Let me show you the difference between {CHEAP} and {PRODUCT}",
];

/** CTA (Call-to-Action) templates for closing scripts */
export const CTA_TEMPLATES: string[] = [
  "Link in bio — trust me, you need this.",
  "Comment '{KEYWORD}' and I'll send you the link!",
  "Use my code {CODE} for {DISCOUNT}% off before it's gone.",
  "Follow for more honest reviews. Link in bio to shop.",
  "Save this for later and thank me! Link below.",
  "This deal ends {DEADLINE} — don't sleep on it.",
  "Drop a 🔥 if you're trying this. Link in bio!",
  "Click the link, try it, come back and tell me I was right.",
];

/**
 * Builds the system prompt for GPT/Claude script generation.
 * This is the core prompt engineering that produces viral UGC scripts.
 */
export function buildScriptSystemPrompt(params: {
  platform: ScriptPlatform;
  audience: TargetAudience;
  tone: ScriptTone;
  format: ScriptFormat;
  duration: string;
}): string {
  const { platform, audience, tone, format, duration } = params;

  const platformRules: Record<ScriptPlatform, string> = {
    tiktok: `
    - TikTok-native language and pacing
    - Front-load the hook in first 1-2 seconds (CRITICAL: 50% of viewers drop by second 2)
    - Use pattern interrupts every 5-7 seconds to maintain retention
    - Conversational, unscripted-feeling delivery even though it's written
    - End with a loop-friendly final line that connects back to the opening
    - Trending audio consideration: leave space for background audio
    - Comment-bait: include at least one slightly polarizing or question-provoking statement`,
    instagram_reels: `
    - Instagram Reels format: slightly more polished than TikTok
    - Visual-forward: emphasize what viewers will SEE alongside what they'll hear
    - Include a save-worthy moment (actionable tip, revelation, or transformation)
    - Aesthetic pacing — slightly slower transitions than TikTok
    - Shareable quality: write something people will DM to friends
    - Caption-friendly: key info works both spoken AND as on-screen text`,
    youtube_shorts: `
    - YouTube Shorts format: hook immediately, deliver value fast
    - Slightly more informational/educational than TikTok
    - Clear value proposition within first 3 seconds
    - Subscribe/engagement CTA appropriate for YouTube ecosystem
    - Structured delivery: audiences expect organized content
    - SEO-friendly language: naturally include searchable terms`,
    facebook: `
    - Facebook format: slightly longer attention span audience
    - More storytelling latitude, can build emotional arcs
    - Values authenticity and relatability over trendy language
    - Include a shareable takeaway that appeals to 30+ demographics
    - Comment engagement: ask for opinions or shared experiences
    - Can reference community/family/practical benefits more directly`,
    universal: `
    - Platform-agnostic format that works across TikTok, Reels, Shorts, and Facebook
    - Strong hook that works on any platform
    - Natural conversational pacing
    - Avoid platform-specific references (no "link in bio" for YouTube, no "stitch this" for Facebook)
    - Versatile CTA that can be adapted per platform`,
  };

  const audienceVoice: Record<TargetAudience, string> = {
    gen_z: "Use casual, internet-native language. Okay to use slang (slay, bussin, era, no cap, lowkey) but SPARINGLY — max 1-2 slang terms per script. Self-aware, slightly ironic delivery. Reference shared generational experiences.",
    millennials: "Smart, self-deprecating humor. Reference adulting, '90s/2000s nostalgia. Value efficiency and work-life balance. Slightly skeptical but open to being convinced with evidence.",
    gen_x: "Direct, no-BS approach. Value quality and proven results. Less flashy, more substance. Respect their intelligence. Skip the trends, focus on genuine value.",
    parents: "Empathize with the chaos of parenting. Time-saving is gold. Solutions that are kid-friendly/family-friendly. Relatable daily struggles.",
    entrepreneurs: "Results-oriented, ROI-focused. Speak to scaling, efficiency, and competitive advantage. Fast-paced delivery. Social proof from business metrics.",
    fitness: "Motivational energy. Science-backed claims. Before/after transformation language. Community-driven ('join the movement'). Performance-focused benefits.",
    beauty: "Texture and sensory descriptions. Before/after results. Ingredient awareness. Routine integration. Glow-up narrative. Address specific skin/hair concerns.",
    tech_savvy: "Feature-focused but benefit-driven. Comparison to alternatives. Specs that matter. Early-adopter appeal. Integration with existing tech stack.",
    broad: "Universally relatable language. Clear value proposition. Avoid niche jargon. Focus on common desires: save time, save money, feel better, look better.",
  };

  const toneDirection: Record<ScriptTone, string> = {
    conversational: "Write like you're telling a friend about something you genuinely love. Use contractions, incomplete sentences, verbal fillers ('like', 'honestly', 'okay so'). Natural pauses. The script should feel like it WASN'T written — like it was just said.",
    professional: "Confident and credible. Clear sentences with data or specifics. No filler words. Authority without arrogance. Think: a smart friend who happens to be an expert.",
    energetic: "HIGH ENERGY from word one. Short punchy sentences. Exclamation points (sparingly in text, heavily in delivery notes). Fast cuts implied. Build momentum throughout.",
    humorous: "Lead with unexpected comedy. Self-deprecating or observational humor. The joke should serve the sell — never sacrifice the message for the laugh. Comedic timing beats matter in script pacing notes.",
    inspirational: "Build an emotional arc. Start with a seed of doubt or struggle, grow through determination, bloom into transformation. The product is the CATALYST in their journey, not the hero.",
    urgent: "Create genuine urgency (not fake scarcity). Time-sensitive language. FOMO triggers. Fast pacing. Each line should build toward 'you need to act NOW.' But keep it authentic — forced urgency kills trust.",
    empathetic: "Start from THEIR pain. Show you deeply understand the struggle. 'I've been there' energy. The product revelation should feel like genuine relief, not a sales pitch.",
    authoritative: "Position as the expert. 'After testing 50+ options...' or 'As someone who's been in this industry for X years...' Data, comparisons, and insider knowledge. Calm confidence.",
  };

  const formatStructure: Record<ScriptFormat, string> = {
    ugc_ad: `Structure as a classic UGC ad:
    [HOOK — 0-3s] Scroll-stopping opener that addresses the viewer directly
    [PROBLEM — 3-8s] Establish the relatable pain point or desire
    [DISCOVERY — 8-12s] Introduce the product as something they found/tried
    [PROOF — 12-20s] Show/demonstrate/explain why it works (benefits, not features)
    [SOCIAL PROOF — 20-24s] Others are using it / results / ratings
    [CTA — 24-${duration}s] Clear call to action with urgency`,

    product_demo: `Structure as a product demonstration:
    [HOOK — 0-3s] "Watch what happens when I..." or "Let me show you something"
    [SETUP — 3-6s] Brief context for what you're about to demonstrate
    [DEMO — 6-18s] Step-by-step walkthrough showing the product in action. Be specific about what viewers will SEE.
    [RESULT — 18-24s] The impressive outcome or transformation
    [CTA — 24-${duration}s] How to get it themselves`,

    testimonial: `Structure as a genuine testimonial:
    [HOOK — 0-3s] A bold claim or reveal about results
    [BACKSTORY — 3-10s] Where they were before (the struggle, what they tried)
    [TURNING POINT — 10-14s] How they found/started using the product
    [RESULTS — 14-22s] Specific, tangible results with details (numbers, timeframes, specific changes)
    [RECOMMENDATION — 22-${duration}s] Personal endorsement + CTA`,

    how_to: `Structure as a tutorial/how-to:
    [HOOK — 0-3s] "Here's how to {DESIRED_OUTCOME} in {TIMEFRAME}"
    [STEP 1 — 3-10s] First step with clear visual instruction
    [STEP 2 — 10-17s] Second step building on the first
    [STEP 3/RESULT — 17-24s] Final step or the impressive result
    [CTA — 24-${duration}s] Where to get what they need to follow along`,

    hook_cta: `Structure as a punchy Hook → CTA (short-form optimized):
    [HOOK — 0-2s] Maximum scroll-stop power in the opening line
    [QUICK PROOF — 2-6s] Rapid social proof or benefit demonstration
    [CTA — 6-${duration}s] Strong direct call to action. This format is ALL impact, NO filler.`,

    story_driven: `Structure as a narrative arc:
    [HOOK — 0-3s] Open mid-story or with an intriguing statement that creates mystery
    [RISING ACTION — 3-12s] Build the struggle, the search, the frustration
    [CLIMAX — 12-18s] The discovery/breakthrough moment with the product
    [RESOLUTION — 18-24s] The transformation and new reality
    [CTA — 24-${duration}s] Invite the viewer into the same journey`,

    problem_solution: `Structure as Problem → Solution:
    [HOOK/PROBLEM — 0-5s] Lead with the pain (make them feel seen)
    [AGITATE — 5-12s] Pour salt in the wound. "And the worst part is..." — make the problem feel urgent
    [SOLUTION — 12-20s] Introduce the product as THE answer. Not A solution — THE solution.
    [PROOF — 20-24s] Quick evidence it works
    [CTA — 24-${duration}s] "Stop suffering and try this"`,

    trend_hijack: `Structure as a trend-riding format:
    [TREND HOOK — 0-3s] Reference trending format/audio/meme but make it about the product
    [SETUP — 3-8s] Set up the trend format (POV, challenge, etc.)
    [PAYOFF — 8-18s] The twist where the product is the punchline/hero
    [GENUINE VALUE — 18-24s] Drop the trend format and speak genuinely about the product
    [CTA — 24-${duration}s] Bridge trend energy into action`,

    comparison: `Structure as This vs That comparison:
    [HOOK — 0-3s] "I tested [this] vs [that] so you don't have to"
    [OPTION A — 3-10s] Show the alternative/old way with its drawbacks
    [OPTION B — 10-18s] Show the product with its advantages (dramatic improvement)
    [VERDICT — 18-24s] Clear winner declaration with specific reasons why
    [CTA — 24-${duration}s] "If you want the [winner], link in bio"`,

    behind_the_scenes: `Structure as Behind the Scenes:
    [HOOK — 0-3s] "Come with me" or "I want to show you something most people don't see"
    [RAW LOOK — 3-12s] Show the authentic process, the mess, the work behind the product
    [SECRET/INSIGHT — 12-18s] Reveal something surprising or genuinely interesting
    [APPRECIATION — 18-24s] Express genuine admiration for the quality/process
    [CTA — 24-${duration}s] Invite viewers to experience it themselves`,
  };

  return `You are the #1 UGC scriptwriter in the world. You've written scripts that have generated over $100M in ad revenue across TikTok, Instagram, YouTube, and Facebook. You understand human psychology, attention economics, and the science of viral short-form content.

YOUR TASK: Write a ${duration}-second video script for a UGC-style short-form video.

═══ PLATFORM ═══
${platformRules[platform]}

═══ TARGET AUDIENCE ═══
${audienceVoice[audience]}

═══ TONE ═══
${toneDirection[tone]}

═══ FORMAT & STRUCTURE ═══
${formatStructure[format]}

═══ UNIVERSAL RULES ═══

HOOK MASTERY (First 1-3 seconds):
- The hook is 80% of the video's performance. Spend disproportionate creative energy here.
- Must create an OPEN LOOP (curiosity gap) or PATTERN INTERRUPT (unexpected statement)
- Should pass the "sound-off test" — hook works as on-screen text too
- Avoid starting with "Hey guys" or generic openers. Every millisecond counts.

PACING & RHYTHM:
- Target ${Math.round(parseInt(duration) * 2.5)}-${Math.round(parseInt(duration) * 3)} words total for ${duration}s (speaking rate: ~150-180 words/min)
- Include [PAUSE] or [BEAT] markers for dramatic timing
- Vary sentence length: short punchy sentences mixed with slightly longer descriptive ones
- No paragraph should be more than 2 sentences spoken back-to-back

AUTHENTICITY MARKERS:
- Include 2-3 "imperfection signals" — verbal stumbles, corrections, or asides that make it feel real
  Examples: "and honestly?", "like I'm not even kidding", "okay wait let me explain", "which sounds crazy but hear me out"
- The script should feel like it was SAID, not WRITTEN
- If you removed the brand mention, it should still be interesting content

PERSUASION TECHNIQUES:
- Use "you" 3x more than "I" — make it about THEIR life, not the creator's
- Specific > General: "reduced my screen time by 2 hours" beats "saves you time"
- Future pacing: help them visualize life AFTER using the product
- Social proof integration: weave in others' experiences naturally

═══ OUTPUT FORMAT ═══

Return ONLY the script in this exact format:

[SECTION_NAME — TIMESTAMP]
"Spoken dialogue goes here in quotes"
(Visual/action direction in parentheses if needed)

IMPORTANT:
- Each section has a header in [BRACKETS — with timestamps]
- Spoken dialogue is in "double quotes"
- Visual/direction notes are in (parentheses)
- Include [BEAT] or [PAUSE] where timing matters
- Total duration must be close to ${duration} seconds
- Do NOT include any intro, explanation, or commentary — JUST the script`;
}

/**
 * Builds the user-side prompt for script generation with all context.
 */
export function buildScriptUserPrompt(params: {
  product: string;
  targetUrl?: string;
  keyBenefits?: string;
  competitorMention?: string;
  pricePoint?: string;
  extraInstructions?: string;
}): string {
  const parts: string[] = [];

  parts.push(`PRODUCT/SERVICE: ${params.product}`);

  if (params.keyBenefits?.trim()) {
    parts.push(`KEY BENEFITS TO HIGHLIGHT: ${params.keyBenefits.trim()}`);
  }

  if (params.pricePoint?.trim()) {
    parts.push(`PRICE POINT: ${params.pricePoint.trim()}`);
  }

  if (params.competitorMention?.trim()) {
    parts.push(`COMPETITOR/ALTERNATIVE TO REFERENCE: ${params.competitorMention.trim()}`);
  }

  if (params.targetUrl?.trim()) {
    parts.push(`PRODUCT URL: ${params.targetUrl.trim()}`);
  }

  if (params.extraInstructions?.trim()) {
    parts.push(`ADDITIONAL CREATIVE DIRECTION: ${params.extraInstructions.trim()}`);
  }

  return parts.join("\n\n");
}


/* ─────────────────────────────────────────────────────────────────────────────
   HOOK GENERATION — STYLE PRESETS
   (Actual hook prompting is done by the backend's hook-prompt-generator.ts)
   ───────────────────────────────────────────────────────────────────────────── */

export type HookStyle = "asmr_satisfying" | "mystery_reach" | "dramatic_reveal" | "auto";

export const HOOK_STYLES: { value: HookStyle; label: string; description: string }[] = [
  { value: "auto", label: "AI Auto-Select", description: "Let AI choose the best hook style for your video" },
  { value: "asmr_satisfying", label: "ASMR / Satisfying", description: "Product ASMR: pours, dumps, textures" },
  { value: "mystery_reach", label: "Mystery Reach", description: "Hands reaching for product in daily context" },
  { value: "dramatic_reveal", label: "Dramatic Reveal", description: "Close-up textures with dramatic unveil" },
];
