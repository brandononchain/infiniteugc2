/* ═══════════════════════════════════════════════════════════════════════════════
   VIDEO GENERATION AGENT SYSTEM
   ═══════════════════════════════════════════════════════════════════════════════
   Master agent + 6 specialist sub-agents for video script/prompt generation.
   Each sub-agent is a full agent with identity, skills, rules, and templates.
   ═══════════════════════════════════════════════════════════════════════════════ */

import type {
  VideoAgentCategory,
  VideoPlatform,
  VideoTone,
  VideoDuration,
  VideoProvider,
  VideoSubAgent,
  VideoAgentTemplate,
  VideoScriptSection,
  VideoClassification,
  VideoGenerationPayload,
} from "./types";

// ── Routing Table (from Master Agent.md) ─────────────────────────────────────

const ROUTING_SIGNALS: Record<VideoAgentCategory, string[]> = {
  "ugc-ad": ["ad", "sell", "product", "convert", "buy", "shop", "discount", "promo", "sale", "offer", "unboxing", "purchase", "deal", "code"],
  "cinematic-hero": ["cinematic", "brand", "hero", "launch", "premium", "epic", "film", "brand film", "commercial", "luxury", "visual"],
  "tutorial-howto": ["tutorial", "how to", "step by step", "guide", "learn", "tips", "teach", "explain", "hack", "trick", "show how"],
  "testimonial": ["review", "testimonial", "experience", "honest", "opinion", "tried", "result", "before after", "transformation", "journey"],
  "trend-hijack": ["trend", "viral", "challenge", "duet", "sound", "stitch", "trending", "pov", "meme", "format"],
  "story-driven": ["story", "journey", "behind the scenes", "day in life", "transformation", "origin", "founder", "bts", "narrative", "why"],
};

// ── Provider Routing Table (from Master Agent.md) ────────────────────────────

const CONTENT_PROVIDER_MAP: Record<string, { primary: VideoProvider; fallback: VideoProvider }> = {
  "avatar-talking": { primary: "heygen", fallback: "hedra_avatar" },
  "full-body": { primary: "omnihuman", fallback: "hedra_omnia" },
  "cinematic": { primary: "sora2pro", fallback: "veo3" },
  "premium": { primary: "veo3", fallback: "sora2pro" },
  "dance-movement": { primary: "seedance", fallback: "omnihuman" },
  "quick-avatar": { primary: "hedra_avatar", fallback: "heygen" },
};

// Category → content type mapping for provider selection
const CATEGORY_CONTENT_TYPE: Record<VideoAgentCategory, string> = {
  "ugc-ad": "avatar-talking",
  "cinematic-hero": "cinematic",
  "tutorial-howto": "avatar-talking",
  "testimonial": "avatar-talking",
  "trend-hijack": "quick-avatar",
  "story-driven": "avatar-talking",
};

// ── Duration Guidelines (from Master Knowledge.md) ───────────────────────────

const DURATION_WORD_COUNTS: Record<string, { min: number; max: number }> = {
  "15s": { min: 30, max: 40 },
  "30s": { min: 60, max: 80 },
  "45s": { min: 90, max: 120 },
  "60s": { min: 120, max: 160 },
  "90s": { min: 180, max: 240 },
  "120s": { min: 240, max: 300 },
};

// ── Platform Defaults ────────────────────────────────────────────────────────

const PLATFORM_DEFAULTS: Record<VideoPlatform, { aspectRatio: string; maxDuration: number; captionImportance: "critical" | "recommended" | "optional" }> = {
  tiktok: { aspectRatio: "9:16", maxDuration: 60, captionImportance: "critical" },
  instagram_reels: { aspectRatio: "9:16", maxDuration: 60, captionImportance: "critical" },
  youtube_shorts: { aspectRatio: "9:16", maxDuration: 60, captionImportance: "recommended" },
  youtube: { aspectRatio: "16:9", maxDuration: 180, captionImportance: "optional" },
  instagram_feed: { aspectRatio: "4:5", maxDuration: 60, captionImportance: "recommended" },
  twitter: { aspectRatio: "16:9", maxDuration: 140, captionImportance: "recommended" },
};

// ── Sub-Agent Template Definitions ───────────────────────────────────────────

const UGC_AD_TEMPLATES: VideoAgentTemplate[] = [
  {
    id: "classic-ugc-ad",
    name: "Classic UGC Product Ad",
    description: "Standard problem → solution UGC ad format",
    tags: ["ugc", "ad", "product", "conversion"],
    duration: "30s",
    structure: "Hook → Problem → Discovery → Demo → CTA",
    sections: [
      { label: "HOOK", duration: "3s", content: "Okay I literally need to tell you about this because I wish someone told ME sooner..." },
      { label: "PROBLEM", duration: "5s", content: "So I've been struggling with [problem] for months, tried everything, nothing worked..." },
      { label: "DISCOVERY", duration: "5s", content: "Then I found [product] and honestly? I'm kind of mad I didn't find it earlier." },
      { label: "DEMO", duration: "10s", content: "Look — [show product]. You just [simple usage]. And the [key benefit]? *chef's kiss*" },
      { label: "CTA", duration: "7s", content: "I put the link in my bio. Seriously, if you've been dealing with [problem], you need this. They're running [offer] right now but I don't know how long it's gonna last." },
    ],
  },
  {
    id: "unboxing-reveal",
    name: "Unboxing & First Impression",
    description: "Exciting product unboxing with genuine reactions",
    tags: ["ugc", "unboxing", "reveal", "excitement"],
    duration: "30s",
    structure: "Tease → Open → React → Demo → CTA",
    sections: [
      { label: "TEASE", duration: "3s", content: "My [product] finally came and I'm SO excited to try this — okay let's open it..." },
      { label: "OPEN", duration: "5s", content: "The packaging is already... okay wow. [React to packaging]. Let me get this out." },
      { label: "REACT", duration: "5s", content: "Oh my god. It's even better in person. Look at [specific detail]." },
      { label: "DEMO", duration: "10s", content: "Let me try it right now — [use product]. [Real-time reaction]. Yeah, this is it." },
      { label: "CTA", duration: "7s", content: "Link is in my bio, and honestly for [price/value], this is insane. Run, don't walk." },
    ],
  },
  {
    id: "problem-agitate-solve",
    name: "Problem-Agitate-Solve",
    description: "Heavy problem emphasis before the solution reveal",
    tags: ["ugc", "problem-solution", "emotional", "conversion"],
    duration: "45s",
    structure: "Problem → Agitate → Solve → Proof → CTA",
    sections: [
      { label: "PROBLEM", duration: "5s", content: "Can we talk about how [common problem] is actually ruining our [routine/life]?" },
      { label: "AGITATE", duration: "8s", content: "Like I've literally tried [competitor 1], [competitor 2], even [DIY approach]. Nothing. And I was about to give up honestly..." },
      { label: "SOLVE", duration: "7s", content: "Until someone in my comments told me about [product]. I was skeptical but I ordered it anyway." },
      { label: "PROOF", duration: "10s", content: "It's been [timeframe] and look at this. [Show results]. I'm not even exaggerating — [specific result]. My [friend/partner] even noticed." },
      { label: "CTA", duration: "5s", content: "Use my code [CODE] for [discount]. Trust me, your future self will thank you." },
    ],
  },
  {
    id: "grwm-integration",
    name: "GRWM Product Integration",
    description: "Natural product placement within a Get Ready With Me format",
    tags: ["ugc", "grwm", "natural", "lifestyle"],
    duration: "45s",
    structure: "Context → Routine → Product Moment → Why → CTA",
    sections: [
      { label: "CONTEXT", duration: "3s", content: "Get ready with me — I've got [event/day] today and I'm trying out something new." },
      { label: "ROUTINE", duration: "8s", content: "So first I'm doing my usual [routine steps]... nothing special here, you know the drill." },
      { label: "PRODUCT", duration: "10s", content: "But HERE is where it gets good. I've been using [product] and okay, let me tell you why. [Apply/use product]. See how [specific benefit]?" },
      { label: "WHY", duration: "8s", content: "What I love about it is [unique selling point]. I've tried other [category] products and they [shortcoming]. This one actually [delivers]." },
      { label: "CTA", duration: "6s", content: "I'll leave the link below. If you're into [interest/need], you're gonna love this. Save this for later!" },
    ],
  },
];

const CINEMATIC_HERO_TEMPLATES: VideoAgentTemplate[] = [
  {
    id: "product-launch-film",
    name: "Product Launch Film",
    description: "Premium product introduction with cinematic grandeur",
    tags: ["cinematic", "launch", "hero", "premium"],
    duration: "45s",
    structure: "Atmosphere → Detail → Reveal → Hero → Context → Close",
    sections: [
      { label: "WIDE", duration: "5s", content: "Slow pan across an abstract environment. Mist. Light breaking through. Anticipation. The score begins — a single sustained note." },
      { label: "DETAIL", duration: "5s", content: "Extreme close-up of a surface — material texture, light catching edges. We don't know what it is yet. Rack focus." },
      { label: "REVEAL", duration: "5s", content: "Slow dolly back. The product emerges from the detail — its form becoming recognizable. Light wraps around it." },
      { label: "HERO", duration: "8s", content: "Full product in frame. Orbiting camera movement. Every detail visible. The light finds every surface. This is the beauty shot." },
      { label: "CONTEXT", duration: "7s", content: "The product in its world — a hand reaching, an environment that embodies the brand promise." },
      { label: "END", duration: "5s", content: "Elegant brand lockup. Name. Tagline. Clean typography on black.", textOverlay: "[Brand Name] — [Tagline]" },
    ],
  },
  {
    id: "brand-mood-film",
    name: "Brand Mood Film",
    description: "Atmospheric brand world film without explicit product focus",
    tags: ["cinematic", "mood", "brand", "atmospheric"],
    duration: "30s",
    structure: "Environment → Human → Texture → Motion → Landing",
    sections: [
      { label: "WIDE", duration: "5s", content: "An environment that IS the brand — architecture, nature, or abstraction. Golden light. Slow crane up." },
      { label: "HUMAN", duration: "5s", content: "A figure in this world, moving with purpose. Back-lit. We see the silhouette, not the face. Mystery." },
      { label: "TEXTURE", duration: "5s", content: "Close-up of a material moment — water, fabric, light through glass. Macro beauty." },
      { label: "MOTION", duration: "5s", content: "Slow motion of something beautiful in motion — liquid, hair, fabric in wind. 3x speed." },
      { label: "END", duration: "5s", content: "Pull back to reveal the full scene. Brand name fades in. Minimal. Below it, a single line that captures the ethos.", textOverlay: "[Brand Name]" },
    ],
  },
  {
    id: "hero-product-orbit",
    name: "Hero Product Orbit",
    description: "Single product, orbiting camera, pure visual worship",
    tags: ["cinematic", "product", "orbit", "minimal"],
    duration: "20s",
    structure: "Black → Orbit → Lock → Brand",
    sections: [
      { label: "BLACK", duration: "5s", content: "Darkness. A point of light appears. It grows. We hear a tone — deep and resonant." },
      { label: "ORBIT", duration: "10s", content: "The product sits on a seamless surface. Camera begins a slow 180-degree orbit. Every angle, every material, every detail illuminated by a moving key light that follows the camera. Slow, reverent, hypnotic." },
      { label: "LOCK", duration: "3s", content: "Camera settles on the hero angle. The definitive view. Perfect lighting. Hold." },
      { label: "END", duration: "2s", content: "Name appears below. Nothing else. Confidence.", textOverlay: "[Brand Name]" },
    ],
  },
];

const TUTORIAL_HOWTO_TEMPLATES: VideoAgentTemplate[] = [
  {
    id: "three-step-howto",
    name: "3-Step How-To",
    description: "Clean three-step tutorial — the most viral educational structure",
    tags: ["tutorial", "how-to", "steps", "educational"],
    duration: "30s",
    structure: "Hook → Step 1 → Step 2 → Step 3 → Result → CTA",
    sections: [
      { label: "HOOK", duration: "3s", content: "3 steps to [achieve result] that nobody talks about. Let's go." },
      { label: "STEP 1", duration: "7s", content: "First, [action]. This is the part most people get wrong — they [common mistake]. Instead, just [correct approach]. See? Easy.", textOverlay: "Step 1" },
      { label: "STEP 2", duration: "7s", content: "Next, [action]. The key here is [specific tip]. This is what makes the difference between [bad result] and [good result].", textOverlay: "Step 2" },
      { label: "STEP 3", duration: "7s", content: "Finally, [action]. And here's the trick — [insider tip]. That's it.", textOverlay: "Step 3" },
      { label: "RESULT", duration: "3s", content: "And there you go. [Show result]. From [before] to [after] in under a minute." },
      { label: "CTA", duration: "3s", content: "Save this so you don't forget. Follow for more [topic] tips." },
    ],
  },
  {
    id: "product-tutorial",
    name: "Product Tutorial",
    description: "How to use a specific product for best results",
    tags: ["tutorial", "product", "demo", "how-to"],
    duration: "45s",
    structure: "Hook → Context → Setup → Technique → Finish → Result → CTA",
    sections: [
      { label: "HOOK", duration: "3s", content: "If you have [product] and you're not doing this, you're using it wrong." },
      { label: "CONTEXT", duration: "5s", content: "So I see a lot of people [common wrong usage]. I get it. But there's a way better way." },
      { label: "SETUP", duration: "8s", content: "First, you want to [preparation step]. I know it seems extra but trust me, this makes all the difference.", textOverlay: "The Setup" },
      { label: "TECHNIQUE", duration: "8s", content: "Now here's the actual secret — instead of [wrong way], you [right way]. Look at that.", textOverlay: "The Technique" },
      { label: "FINISH", duration: "8s", content: "And to finish, [final step]. This locks everything in and gives you [final benefit].", textOverlay: "The Finish" },
      { label: "RESULT", duration: "5s", content: "See the difference? [Before state] versus [after state]. Night and day." },
      { label: "CTA", duration: "3s", content: "Comment 'HOW' if you want my full [topic] routine." },
    ],
  },
  {
    id: "tips-tricks",
    name: "Quick Tips & Tricks",
    description: "Rapid-fire tips format for maximum save-rate",
    tags: ["tutorial", "tips", "tricks", "rapid"],
    duration: "30s",
    structure: "Hook → Tip 1 → Tip 2 → Tip 3 → Bonus → CTA",
    sections: [
      { label: "HOOK", duration: "2s", content: "[Number] [topic] hacks you didn't know you needed. Ready?" },
      { label: "TIP 1", duration: "6s", content: "Hack number one: [tip]. Most people don't know this but [why it works]. Game changer.", textOverlay: "#1" },
      { label: "TIP 2", duration: "6s", content: "Number two: [tip]. This one sounds weird but [proof/reason]. Try it.", textOverlay: "#2" },
      { label: "TIP 3", duration: "6s", content: "And number three — this is the big one: [tip]. [Result or proof]. You're welcome.", textOverlay: "#3" },
      { label: "BONUS", duration: "5s", content: "Oh, and bonus tip: [extra tip]. Okay now you literally have no excuse.", textOverlay: "BONUS" },
      { label: "CTA", duration: "3s", content: "Save this. Share it with someone who needs it. Follow for more." },
    ],
  },
];

const TESTIMONIAL_TEMPLATES: VideoAgentTemplate[] = [
  {
    id: "honest-review",
    name: "Honest Product Review",
    description: "Balanced, credible product review with genuine reactions",
    tags: ["testimonial", "review", "honest", "trust"],
    duration: "45s",
    structure: "Setup → Skepticism → Experience → Caveat → Verdict → CTA",
    sections: [
      { label: "SETUP", duration: "5s", content: "Okay so I've been using [product] for [timeframe] now, and I have thoughts. Honest ones." },
      { label: "SKEPTICISM", duration: "7s", content: "When I first heard about it, I was honestly pretty skeptical. I'd already tried [alternative 1] and [alternative 2], and neither really worked for me. So I wasn't expecting much." },
      { label: "EXPERIENCE", duration: "10s", content: "But I started using it [how], and after about [timeframe], I noticed [specific change]. Like, actually noticeable. The [specific detail] was the first thing — then [second observation]." },
      { label: "CAVEAT", duration: "5s", content: "Now, is it perfect? No. I will say [minor negative or wish]. That's my one thing. But honestly..." },
      { label: "VERDICT", duration: "8s", content: "For what it does? And especially at [price point]? Yeah. I'm keeping this one. It's become part of my [routine/daily use] and I genuinely recommend it." },
      { label: "CTA", duration: "5s", content: "If you've been on the fence, I'd say go for it. Link below." },
    ],
  },
  {
    id: "before-after-journey",
    name: "Before & After Journey",
    description: "Transformation story with measurable before/after results",
    tags: ["testimonial", "transformation", "before-after", "results"],
    duration: "60s",
    structure: "Before → Discovery → Early → Turning Point → Results → Verdict → CTA",
    sections: [
      { label: "BEFORE", duration: "8s", content: "So [timeframe] ago, I was dealing with [problem]. Like, it was bad. I was [specific impact on life]. I'd tried basically everything." },
      { label: "DISCOVERY", duration: "5s", content: "A friend mentioned [product] and I was like, sure, why not, I'll try one more thing." },
      { label: "EARLY", duration: "8s", content: "First [time period], I'm gonna be real — I didn't notice much. I almost stopped. But I kept going because [reason]." },
      { label: "TURNING POINT", duration: "8s", content: "Then around [time period], something shifted. I [specific first sign of change]. And then [second change]. I literally took a photo because I couldn't believe it." },
      { label: "RESULTS", duration: "10s", content: "Now, [timeframe] later? Look at this. [Describe before vs. after]. The difference is [specific metric or visible change]. My [friend/family/coworker] even asked what I'd changed." },
      { label: "VERDICT", duration: "6s", content: "I'm not gonna say this works for everyone. But for me? It actually worked. And I wish I'd found it sooner." },
      { label: "CTA", duration: "5s", content: "Link in the description if you want to try it. Just be patient with it — give it [time period]." },
    ],
  },
  {
    id: "skeptic-converted",
    name: "Skeptic Converted",
    description: "Heavy skepticism arc that builds to genuine conviction",
    tags: ["testimonial", "skeptic", "conversion", "trust"],
    duration: "45s",
    structure: "Skeptic → Research → First Use → Converted → Honest → CTA",
    sections: [
      { label: "SKEPTIC", duration: "8s", content: "I'm the person who doesn't fall for trending products. Like, I read all the bad reviews first. So when I kept seeing [product] everywhere, I rolled my eyes." },
      { label: "RESEARCH", duration: "5s", content: "But then I actually looked into [specific ingredient/feature/tech] and the [data/research/logic] behind it made sense. So I ordered one. Just to see." },
      { label: "FIRST USE", duration: "8s", content: "First time using it — [honest first impression, not over-the-top]. It was [adjective] but I wasn't sold yet. I committed to [time period] before judging." },
      { label: "CONVERTED", duration: "8s", content: "Yeah. I'm converted. By [time period], [specific measurable result]. The [specific feature] actually does what they say. I was wrong." },
      { label: "HONEST", duration: "6s", content: "I'll be honest — [small caveat]. But overall? This is one of the very few products I've bought from social media that actually delivered." },
      { label: "CTA", duration: "5s", content: "Link's below. And yeah, I'm the person I never thought I'd be — recommending something I saw on my feed." },
    ],
  },
];

const TREND_HIJACK_TEMPLATES: VideoAgentTemplate[] = [
  {
    id: "pov-format",
    name: "POV Trend",
    description: "Classic POV format adapted for product/brand content",
    tags: ["trend", "pov", "viral", "format"],
    duration: "15s",
    structure: "POV Text → Beats → Reveal",
    sections: [
      { label: "POV", duration: "3s", content: "[Skeptical face / looking at product]", textOverlay: "POV: You finally found a [product category] that actually works" },
      { label: "TRY", duration: "3s", content: "[Trying the product, slight surprise]" },
      { label: "REACT", duration: "4s", content: "[Clear reaction — the moment it works, visible satisfaction]" },
      { label: "CONFIRM", duration: "3s", content: "[Looking at camera like 'yeah, this is it' — smug/satisfied]" },
      { label: "END", duration: "2s", content: "[Hold product up to camera with a knowing nod]" },
    ],
  },
  {
    id: "expectation-reality",
    name: "Expectation vs Reality",
    description: "Humorous comparison subverted to showcase product quality",
    tags: ["trend", "humor", "comparison", "viral"],
    duration: "20s",
    structure: "Expectation → Transition → Reality → React → End",
    sections: [
      { label: "EXPECT", duration: "5s", content: "What I expected when I ordered [product] online: [Show exaggerated low expectations]", textOverlay: "Expectation vs Reality" },
      { label: "TRANSITION", duration: "2s", content: "[Quick cut / beat drop]" },
      { label: "REALITY", duration: "5s", content: "What I actually got: [Show the product looking amazing, better than expected]" },
      { label: "REACT", duration: "3s", content: "[Genuine surprise reaction — raised eyebrows, looking at camera]" },
      { label: "END", duration: "5s", content: "[Product name + engaging question]", textOverlay: "[Product] — has an online order ever exceeded your expectations?" },
    ],
  },
  {
    id: "storytime-quick",
    name: "Quick Storytime",
    description: "Rapid personal narrative with product integration",
    tags: ["trend", "storytime", "narrative", "fast"],
    duration: "25s",
    structure: "Hook → Setup → Twist → Result → Close",
    sections: [
      { label: "HOOK", duration: "3s", content: "Okay storytime because this is actually insane—" },
      { label: "SETUP", duration: "5s", content: "So I was [relatable situation] and I was literally about to [give up / accept bad outcome]." },
      { label: "TWIST", duration: "5s", content: "Then my [friend/sister/coworker] was like 'have you tried [product]?' and I was like no? What is that?" },
      { label: "RESULT", duration: "5s", content: "Y'all. [Dramatic pause]. It WORKED. Like, [specific result]. I called [friend] back and was like YOU GENIUS." },
      { label: "CLOSE", duration: "4s", content: "Anyway that's my sign to you. You're welcome. [Product name] link in bio." },
      { label: "CTA", duration: "3s", content: "[Engagement prompt]", textOverlay: "Stitch this with YOUR storytime" },
    ],
  },
];

const STORY_DRIVEN_TEMPLATES: VideoAgentTemplate[] = [
  {
    id: "transformation-journey",
    name: "Transformation Journey",
    description: "Full transformation arc from struggle to triumph",
    tags: ["story", "transformation", "emotional", "journey"],
    duration: "60s",
    structure: "Setup → Struggle → Discovery → Early Days → Turning Point → Now → Reflection",
    sections: [
      { label: "SETUP", duration: "5s", content: "[Quiet, reflective tone] Six months ago, I was [describe the before state]. I remember [specific moment that captures the struggle]." },
      { label: "STRUGGLE", duration: "10s", content: "I tried everything. [Specific attempt 1], [attempt 2]. I spent [time/money]. Nothing worked. And honestly? I was starting to think this was just... how it was gonna be." },
      { label: "DISCOVERY", duration: "8s", content: "Then [how they found the product]. I almost didn't [buy it / try it] because [honest doubt]. But something made me go for it." },
      { label: "EARLY DAYS", duration: "8s", content: "First couple weeks? [Honest early experience]. Not dramatic. Just... [small first sign]. Enough to keep going." },
      { label: "TURNING POINT", duration: "8s", content: "Then one morning, [the moment]. I [specific observation]. And I realized — this is actually working. [Emotional reaction]." },
      { label: "NOW", duration: "8s", content: "[Warmer, more confident tone] Now? [Describe the after state]. It's not perfect. But [specific measurable/visible change]. And I feel [emotion]." },
      { label: "REFLECTION", duration: "5s", content: "If you're where I was [timeframe] ago — just know it gets better. You just need [the right thing]." },
      { label: "CTA", duration: "3s", content: "[Product name] is linked below. That's my story. I hope it helps." },
    ],
  },
  {
    id: "day-in-the-life",
    name: "Day in the Life",
    description: "Dawn-to-dusk story with product naturally woven in",
    tags: ["story", "daily", "lifestyle", "routine"],
    duration: "45s",
    structure: "Dawn → Morning → Midday → Afternoon → Evening → Close",
    sections: [
      { label: "DAWN", duration: "5s", content: "[Soft, just-woke-up energy] 5:47 AM. Alarm goes off. Today's a big day — [context for what's happening today]." },
      { label: "MORNING", duration: "8s", content: "First thing: [morning routine moment with product naturally present]. This has become my [ritual/non-negotiable]. [Why it matters to the morning]." },
      { label: "MIDDAY", duration: "8s", content: "[Energy picks up] By noon, I'm [activity]. This is where [product benefit becomes relevant]. Before I had this, I used to [old way]. Now [new way]." },
      { label: "AFTERNOON", duration: "7s", content: "[Quick montage energy] [Activity], [activity], [activity]. Through all of it — [product is there, doing its thing]. It just... works in the background." },
      { label: "EVENING", duration: "7s", content: "[Winding down energy] End of the day. [Reflective moment]. I think what I love about [product] is that it's not loud. It's just... reliable. It fits." },
      { label: "CLOSE", duration: "5s", content: "[Looking at camera, genuine] If you want a day that flows like this — I put everything I use in my bio. [Product name] is the one that changed things." },
    ],
  },
  {
    id: "behind-the-scenes",
    name: "Behind the Scenes",
    description: "The making-of, the craft, the process behind a product",
    tags: ["story", "bts", "process", "authentic"],
    duration: "45s",
    structure: "Open → Process → Challenge → Detail → Why → Close",
    sections: [
      { label: "OPEN", duration: "5s", content: "Most people see the finished [product]. But they don't see this part." },
      { label: "PROCESS", duration: "10s", content: "[Show/describe the making process]. Every [unit] takes [time/effort]. [Specific detail about craftsmanship]. It's not the fastest way. But it's the right way." },
      { label: "CHALLENGE", duration: "8s", content: "The hardest part is [honest challenge in the process]. There are days when [struggle]. When [setback]. But then [what keeps them going]." },
      { label: "DETAIL", duration: "7s", content: "See this? [Point out a small detail most people miss]. That's [time/effort] of [process]. Most [competitors] skip this step. We don't." },
      { label: "WHY", duration: "7s", content: "We do it this way because [belief/value]. Because [what the customer deserves]. Because [mission]." },
      { label: "CLOSE", duration: "3s", content: "That's what's behind every [product]. Now you know." },
    ],
  },
  {
    id: "founder-origin",
    name: "Founder Origin Story",
    description: "Why the brand/product was created — the human story behind it",
    tags: ["story", "founder", "origin", "mission"],
    duration: "60s",
    structure: "Before → Moment → Beginning → Struggle → Breakthrough → Now → Mission",
    sections: [
      { label: "BEFORE", duration: "8s", content: "Before [brand name], I was [previous life/job]. Doing [activity]. And every day I dealt with [the problem that inspired the product]." },
      { label: "MOMENT", duration: "8s", content: "One day, [the inciting incident — the specific moment that sparked the idea]. I remember thinking: why does nobody fix this?" },
      { label: "BEGINNING", duration: "10s", content: "So I [first action]. It was terrible. The first version was [funny/humble description]. But [someone] tried it and said [reaction that validated the idea]." },
      { label: "STRUGGLE", duration: "8s", content: "The next [time period] was [honest about the difficulty]. [Specific setback]. There were moments I almost stopped." },
      { label: "BREAKTHROUGH", duration: "8s", content: "Then [the turning point]. We [specific achievement — first sale, first customer, first real product]. And I knew this was real." },
      { label: "NOW", duration: "5s", content: "That was [time period] ago. Now [where the brand is today]. But every time I [interact with the product], I still think about [that original problem]." },
      { label: "MISSION", duration: "3s", content: "That's why [brand name] exists. Not because the world needed another [category]. Because [the real reason]." },
    ],
  },
];

// ── Sub-Agent Registry ───────────────────────────────────────────────────────

export const VIDEO_SUB_AGENTS: VideoSubAgent[] = [
  {
    id: "ugc-ad",
    name: "UGC Ad Creator",
    description: "Direct-response UGC-style video ads that feel authentic",
    voice: "Authentic, conversational, slightly breathless with excitement",
    defaultParams: {
      duration: "30s",
      provider: "heygen",
      aspectRatio: "9:16",
      pacing: "Fast — new beat every 3-5 seconds",
      captionStyle: "Bold, centered, keyword-highlighted",
    },
    rules: {
      must: ["Open with scroll-stopping hook", "Include authentic reaction moment", "End with clear specific CTA", "Use conversational language"],
      mustNot: ["Sound like TV commercial", "Use formal language", "Exceed 160 words for 60s", "Skip problem/pain point", "Use more than one CTA action"],
      defaults: { tone: "Conversational, excited, authentic", structure: "Hook → Problem → Solution → Proof → CTA", duration: "30 seconds", pacing: "3-5 second beats" },
    },
    skills: ["Hook Crafting", "Problem-Solution Framing", "Authenticity Engineering", "CTA Architecture"],
    templates: UGC_AD_TEMPLATES,
  },
  {
    id: "cinematic-hero",
    name: "Cinematic Brand Director",
    description: "Premium film-quality brand content and product hero videos",
    voice: "Poetic, visual, commanding",
    defaultParams: {
      duration: "45s",
      provider: "veo3",
      aspectRatio: "16:9",
      pacing: "Deliberate — 5-8 second shots",
      captionStyle: "Minimal, elegant serif typography",
    },
    rules: {
      must: ["Include framing, movement, lighting, mood per shot", "Use cinematic language", "Maintain consistent color grade", "End with hero moment"],
      mustNot: ["UGC-casual language", "Hard-sell CTAs", "Rush pacing", "More than 15 words on-screen text", "Same angle every shot"],
      defaults: { provider: "veo3", pacing: "5-8 seconds per beat", audio: "Instrumental/ambient score", endCard: "Brand name, minimal, elegant" },
    },
    skills: ["Visual Storytelling Without Dialogue", "Shot Composition for Cinema", "Color Grading Direction", "Non-Verbal Narrative Arc"],
    templates: CINEMATIC_HERO_TEMPLATES,
  },
  {
    id: "tutorial-howto",
    name: "Tutorial Creator",
    description: "Educational content that teaches while entertaining",
    voice: "Clear, confident, slightly surprised by how easy this is",
    defaultParams: {
      duration: "30s",
      provider: "heygen",
      aspectRatio: "9:16",
      pacing: "Moderate — 5-7 second steps",
      captionStyle: "Bold, step-numbered, keyword highlighted",
    },
    rules: {
      must: ["Number or label steps explicitly", "Deliver on hook's promise", "Show result/outcome at end", "Use jargon-free language", "Include text overlay for step numbers"],
      mustNot: ["Skip steps or assume knowledge", "Exceed 5 main steps", "Use filler that doesn't teach", "End without showing result"],
      defaults: { steps: "3", hookStyle: "X things you didn't know...", cta: "Save this for later", pacing: "5-7 seconds per step" },
    },
    skills: ["Information Architecture", "Educational Hook Styles", "Visual Direction for Teaching", "Retention Techniques"],
    templates: TUTORIAL_HOWTO_TEMPLATES,
  },
  {
    id: "testimonial",
    name: "Testimonial Director",
    description: "Believable, conversion-driving customer testimonial videos",
    voice: "Genuine, measured, trustworthy",
    defaultParams: {
      duration: "45s",
      provider: "heygen",
      aspectRatio: "9:16",
      pacing: "Moderate — conversational rhythm, 5-8 second beats",
      captionStyle: "Clean, readable, trust-building",
    },
    rules: {
      must: ["Include skepticism beat", "Include specific detail", "Include balanced view (minor negative)", "Sound like real person", "Include unexpected benefit moment"],
      mustNot: ["Use hyperbole", "Sound scripted", "Skip personal context", "Be 100% positive with zero caveats", "Use marketing jargon"],
      defaults: { tone: "Honest, measured, genuinely pleased", structure: "Setup → Skepticism → Experience → Result → Verdict", energy: "Start low, build moderately" },
    },
    skills: ["Trust Architecture", "Testimonial Story Arc", "Credibility Markers", "Emotional Calibration"],
    templates: TESTIMONIAL_TEMPLATES,
  },
  {
    id: "trend-hijack",
    name: "Trend Hijacker",
    description: "Trending format content that rides viral waves for brands",
    voice: "Internet-native, fast, self-aware",
    defaultParams: {
      duration: "15s",
      provider: "hedra_avatar",
      aspectRatio: "9:16",
      pacing: "Fast — 2-4 second cuts",
      captionStyle: "Bold, meme-style, oversized text",
    },
    rules: {
      must: ["Match trend's native energy exactly", "Integrate brand naturally", "Keep under 30 seconds", "Include engagement trigger"],
      mustNot: ["Be late to trend", "Force brand messaging", "Be cringe-earnest in ironic formats", "Use corporate language", "Explain the trend in the video"],
      defaults: { duration: "15-20 seconds", tone: "Self-aware, fun, internet-native", cta: "Engagement-focused (comment, duet, stitch)" },
    },
    skills: ["Trend Format Adaptation", "Sound/Music Integration", "Viral Mechanics", "Cultural Fluency"],
    templates: TREND_HIJACK_TEMPLATES,
  },
  {
    id: "story-driven",
    name: "Story Director",
    description: "Compelling human stories that make people feel something",
    voice: "Warm, narrative, human",
    defaultParams: {
      duration: "60s",
      provider: "heygen",
      aspectRatio: "9:16",
      pacing: "Narrative rhythm — slow builds, emotional peaks",
      captionStyle: "Clean, emotional emphasis on key phrases",
    },
    rules: {
      must: ["Clear protagonist", "Vulnerability/struggle beat", "Earn emotional payoff", "Use specific details", "Product as catalyst not hero"],
      mustNot: ["Brand as protagonist", "Skip the struggle", "Be emotionally manipulative", "Rush resolution", "Front-load product mention"],
      defaults: { structure: "Setup → Struggle → Discovery → Transformation → Reflection", protagonist: "Relatable person", productRole: "Catalyst/enabler" },
    },
    skills: ["Narrative Arc Construction", "Emotional Beat Mapping", "Character Construction", "Sensory Storytelling"],
    templates: STORY_DRIVEN_TEMPLATES,
  },
];

// ── Master Agent: Intent Classifier ──────────────────────────────────────────

export function classifyVideoIntent(
  userPrompt: string,
  options: { platform?: VideoPlatform } = {}
): VideoClassification {
  const lower = userPrompt.toLowerCase();
  const scores: Record<VideoAgentCategory, number> = {
    "ugc-ad": 0,
    "cinematic-hero": 0,
    "tutorial-howto": 0,
    "testimonial": 0,
    "trend-hijack": 0,
    "story-driven": 0,
  };

  for (const [category, signals] of Object.entries(ROUTING_SIGNALS)) {
    for (const signal of signals) {
      if (lower.includes(signal)) {
        scores[category as VideoAgentCategory] += 1;
      }
    }
  }

  const maxScore = Math.max(...Object.values(scores), 1);
  const normalized = Object.fromEntries(
    Object.entries(scores).map(([k, v]) => [k, v / maxScore])
  ) as Record<VideoAgentCategory, number>;

  const sorted = Object.entries(normalized).sort(([, a], [, b]) => b - a);
  const [topCategory, topScore] = sorted[0] as [VideoAgentCategory, number];

  const platform = options.platform || detectPlatform(lower);
  const tone = detectVideoTone(lower);
  const duration = detectDuration(lower);

  const entities = userPrompt
    .split(/\s+/)
    .filter((w) => w.length > 2 && /^[A-Z]/.test(w))
    .map((w) => w.replace(/[.,!?;:]+$/, ""));

  return {
    category: topCategory,
    confidence: topScore,
    platform,
    tone,
    duration,
    entities,
  };
}

function detectPlatform(text: string): VideoPlatform {
  if (text.includes("tiktok") || text.includes("tok")) return "tiktok";
  if (text.includes("reel")) return "instagram_reels";
  if (text.includes("youtube short") || text.includes("yt short")) return "youtube_shorts";
  if (text.includes("youtube") || text.includes("yt")) return "youtube";
  if (text.includes("instagram") || text.includes("ig")) return "instagram_feed";
  if (text.includes("twitter") || text.includes("x.com")) return "twitter";
  return "tiktok"; // default
}

function detectVideoTone(text: string): VideoTone {
  const tones: Record<VideoTone, string[]> = {
    energetic: ["energetic", "hype", "exciting", "dynamic", "fast"],
    professional: ["professional", "corporate", "business", "formal"],
    conversational: ["casual", "chill", "conversational", "friendly", "relaxed"],
    dramatic: ["dramatic", "cinematic", "epic", "powerful", "intense"],
    humorous: ["funny", "humor", "comedy", "joke", "meme", "lol"],
    urgent: ["urgent", "limited", "hurry", "now", "fast", "deadline"],
    empathetic: ["empathetic", "emotional", "heartfelt", "vulnerable", "caring"],
    inspirational: ["inspirational", "motivational", "inspire", "dream", "aspire"],
  };

  for (const [tone, keywords] of Object.entries(tones)) {
    if (keywords.some((k) => text.includes(k))) return tone as VideoTone;
  }
  return "conversational";
}

function detectDuration(text: string): VideoDuration {
  if (text.includes("short") || text.includes("quick") || text.includes("15 sec") || text.includes("15s")) return "short";
  if (text.includes("long") || text.includes("detailed") || text.includes("90") || text.includes("120") || text.includes("2 min")) return "long";
  return "medium";
}

// ── Master Agent: Video Payload Generator ────────────────────────────────────

export function generateVideoPayload(
  userPrompt: string,
  options: {
    platform?: VideoPlatform;
    tone?: VideoTone;
    templateId?: string;
    provider?: VideoProvider;
  } = {}
): VideoGenerationPayload {
  const classification = classifyVideoIntent(userPrompt, { platform: options.platform });
  const agent = VIDEO_SUB_AGENTS.find((a) => a.id === classification.category)!;

  // Override with user-specified options
  const tone = options.tone || classification.tone;
  const platform = options.platform || classification.platform;
  const platformDefaults = PLATFORM_DEFAULTS[platform];

  // Select provider
  const contentType = CATEGORY_CONTENT_TYPE[classification.category];
  const providerMap = CONTENT_PROVIDER_MAP[contentType];
  const provider = options.provider || providerMap?.primary || agent.defaultParams.provider;

  // Get template
  let sections: VideoScriptSection[];
  let templateUsed: string | undefined;
  let duration = classification.duration;

  if (options.templateId) {
    const template = agent.templates.find((t) => t.id === options.templateId);
    if (template) {
      sections = template.sections;
      templateUsed = template.id;
      duration = parseDuration(template.duration);
    } else {
      sections = agent.templates[0]?.sections || [];
      templateUsed = agent.templates[0]?.id;
    }
  } else {
    // Auto-select best matching template
    const bestTemplate = findBestVideoTemplate(agent, userPrompt);
    sections = bestTemplate.sections;
    templateUsed = bestTemplate.id;
    duration = parseDuration(bestTemplate.duration);
  }

  // Build full script from sections
  const script = sections.map((s) => `[${s.label} - ${s.duration}] ${s.content}`).join("\n");

  return {
    script,
    sections,
    provider,
    agentUsed: classification.category,
    templateUsed,
    platform,
    tone,
    duration,
    aspectRatio: platformDefaults.aspectRatio,
    captionStyle: agent.defaultParams.captionStyle,
    confidence: classification.confidence,
    needsClarification: classification.confidence < 0.3,
  };
}

function parseDuration(durationStr: string): VideoDuration {
  const seconds = parseInt(durationStr);
  if (isNaN(seconds)) return "medium";
  if (seconds <= 20) return "short";
  if (seconds <= 45) return "medium";
  return "long";
}

function findBestVideoTemplate(agent: VideoSubAgent, userPrompt: string): VideoAgentTemplate {
  const lower = userPrompt.toLowerCase();
  let bestMatch: VideoAgentTemplate | null = null;
  let bestScore = 0;

  for (const template of agent.templates) {
    let score = 0;
    for (const tag of template.tags) {
      if (lower.includes(tag)) score += 2;
    }
    for (const word of template.name.toLowerCase().split(/\s+/)) {
      if (lower.includes(word) && word.length > 3) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = template;
    }
  }

  return bestMatch || agent.templates[0];
}

// ── Public API ───────────────────────────────────────────────────────────────

/** Get all video sub-agents */
export function getVideoAgents(): VideoSubAgent[] {
  return VIDEO_SUB_AGENTS;
}

/** Get a specific video sub-agent */
export function getVideoAgent(category: VideoAgentCategory): VideoSubAgent | undefined {
  return VIDEO_SUB_AGENTS.find((a) => a.id === category);
}

/** Get all templates across all video agents */
export function getAllVideoTemplates(): (VideoAgentTemplate & { category: VideoAgentCategory; agentName: string })[] {
  return VIDEO_SUB_AGENTS.flatMap((agent) =>
    agent.templates.map((t) => ({ ...t, category: agent.id, agentName: agent.name }))
  );
}

/** Get templates for a specific agent category */
export function getVideoTemplates(category: VideoAgentCategory): VideoAgentTemplate[] {
  return VIDEO_SUB_AGENTS.find((a) => a.id === category)?.templates || [];
}

/** Get recommended provider for a category */
export function getRecommendedProvider(category: VideoAgentCategory): { primary: VideoProvider; fallback: VideoProvider } {
  const contentType = CATEGORY_CONTENT_TYPE[category];
  return CONTENT_PROVIDER_MAP[contentType] || { primary: "heygen", fallback: "hedra_avatar" };
}

/** Get platform defaults */
export function getPlatformDefaults(platform: VideoPlatform) {
  return PLATFORM_DEFAULTS[platform];
}

/** Get duration word count guidelines */
export function getDurationGuidelines() {
  return DURATION_WORD_COUNTS;
}
