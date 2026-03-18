import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

/* ═══════════════════════════════════════════════════════════
   CoPilot API — Processes user prompts and returns workflow actions
   ═══════════════════════════════════════════════════════════ */

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

const SYSTEM_PROMPT = `You are CoPilot, an AI assistant for InfiniteUGC — a platform that creates high-quality AI-generated UGC (User Generated Content) videos.

Your job is to interpret what the user wants and build a video creation workflow on their canvas. You respond with a message AND a list of actions that configure the workflow nodes.

AVAILABLE NODE TYPES:
- product: The product/brand being advertised (name, description, url)
- avatar: The AI presenter/actor in the video
- script: The script/dialogue for the video
- voice: The voice for narration
- provider: The video generation engine (heygen, omnihuman, sora2, sora2pro, seedance, hedra_avatar, hedra_omnia, veo3)
- captions: Auto-generated captions
- output: Final video output settings

AVAILABLE ACTIONS:
1. add_node — Add a node to canvas: { "type": "add_node", "payload": { "nodeType": "<type>", "data": {...} }, "label": "Added <type>" }
2. configure_node — Update a node: { "type": "configure_node", "payload": { "nodeType": "<type>", "data": {...} }, "label": "Configured <type>" }
3. connect_nodes — Connect two nodes: { "type": "connect_nodes", "payload": { "from": "<type>", "to": "<type>" }, "label": "Connected <from> → <to>" }
4. generate_script — Generate a script: { "type": "generate_script", "payload": { "content": "<script text>" }, "label": "Generated script" }

VIDEO PROVIDERS (choose based on quality needs):
- heygen: Fast, good for standard talking-head UGC (1 credit)
- hedra_avatar: Budget-friendly avatar videos (1 credit)
- hedra_omnia: Good quality Hedra model (2 credits)
- sora2: High quality video generation (2 credits)
- seedance: Fast, stylized videos (1 credit)
- omnihuman: Premium, ultra-realistic avatars (3 credits)
- veo3: Google's premium video AI (4 credits)
- sora2pro: Highest quality Sora model (5 credits)

SCRIPT WRITING GUIDELINES:
- Write scripts in a natural, conversational UGC style
- Include a strong hook in the first 3 seconds
- Keep it authentic and relatable
- Match the tone to the product and platform
- For TikTok: 15-30 seconds, punchy and fast
- For Instagram: 30-60 seconds, polished but authentic
- For YouTube: 60-90 seconds, more detailed

WHEN RESPONDING:
1. Always include a friendly, concise message explaining what you built
2. Include ALL necessary actions to set up the workflow
3. ALWAYS generate a script when the user describes what they want — include it as a configure_node action on the script node with a "generatedContent" field
4. Choose the best provider based on the quality implied
5. Enable captions by default for social media content
6. Set up ALL nodes: product, avatar, script, voice, provider, captions, output

RESPONSE FORMAT (JSON):
{
  "message": "Your conversational response to the user",
  "actions": [
    { "type": "configure_node", "payload": { "nodeType": "product", "data": { "name": "...", "description": "..." } }, "label": "Set product info" },
    { "type": "configure_node", "payload": { "nodeType": "script", "data": { "generatedContent": "..." } }, "label": "Generated script" },
    { "type": "configure_node", "payload": { "nodeType": "provider", "data": { "provider": "heygen" } }, "label": "Selected HeyGen" },
    { "type": "configure_node", "payload": { "nodeType": "captions", "data": { "enabled": true } }, "label": "Enabled captions" },
    { "type": "configure_node", "payload": { "nodeType": "output", "data": { "campaignName": "..." } }, "label": "Named campaign" }
  ]
}

IMPORTANT: Your response must be valid JSON. Only return the JSON object, nothing else.`;

interface CoPilotRequest {
  message: string;
  history: Array<{ role: string; content: string }>;
  canvasState: Array<{ type: string; status: string; data: Record<string, unknown> }>;
}

export async function POST(req: NextRequest) {
  try {
    const body: CoPilotRequest = await req.json();
    const { message, history, canvasState } = body;

    // Build context about current canvas state
    const canvasContext =
      canvasState.length > 0
        ? `\n\nCURRENT CANVAS STATE:\n${canvasState
            .map((n) => `- ${n.type}: ${n.status} ${JSON.stringify(n.data)}`)
            .join("\n")}`
        : "\n\nCANVAS IS EMPTY — Set up all nodes from scratch.";

    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: SYSTEM_PROMPT + canvasContext },
      ...history.slice(-8).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    // Try OpenAI first
    if (process.env.OPENAI_API_KEY) {
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages,
          temperature: 0.7,
          max_tokens: 2000,
          response_format: { type: "json_object" },
        });

        const responseText = completion.choices[0]?.message?.content || "{}";
        const parsed = JSON.parse(responseText);

        return NextResponse.json({
          message: parsed.message || "I've set up your workflow!",
          actions: parsed.actions || [],
        });
      } catch (aiErr) {
        console.error("OpenAI error, falling back to template:", aiErr);
      }
    }

    // Fallback: Template-based workflow builder
    const result = buildWorkflowFromTemplate(message);
    return NextResponse.json(result);
  } catch (err) {
    console.error("CoPilot API error:", err);
    return NextResponse.json(
      { message: "Something went wrong. Please try again.", actions: [] },
      { status: 500 }
    );
  }
}

/* ═══════════════════════════════════════════════════════════
   Template Fallback — Builds workflow without AI
   ═══════════════════════════════════════════════════════════ */

function buildWorkflowFromTemplate(message: string) {
  const lower = message.toLowerCase();

  // Detect product
  let productName = "Product";
  let productDesc = "A great product for the modern consumer";
  const productPatterns = [
    /(?:for|about|of|promote|promoting|advertising)\s+(?:a\s+|an\s+|my\s+|the\s+)?([a-zA-Z\s]+?)(?:\s+with|\s+that|\s+featuring|$|,|\.|!)/i,
  ];
  for (const pat of productPatterns) {
    const match = message.match(pat);
    if (match) {
      productName = match[1].trim().replace(/\b\w/g, (c) => c.toUpperCase());
      productDesc = `${productName} — featured in this UGC campaign`;
      break;
    }
  }

  // Detect tone
  let tone = "conversational";
  if (lower.includes("energetic") || lower.includes("hype") || lower.includes("excited")) tone = "energetic";
  else if (lower.includes("professional") || lower.includes("formal")) tone = "professional";
  else if (lower.includes("funny") || lower.includes("humorous") || lower.includes("comedy")) tone = "humorous";
  else if (lower.includes("calm") || lower.includes("relaxed") || lower.includes("chill")) tone = "calm";

  // Detect platform
  let platform = "TikTok";
  if (lower.includes("instagram") || lower.includes("ig") || lower.includes("reels")) platform = "Instagram";
  else if (lower.includes("youtube") || lower.includes("yt")) platform = "YouTube";
  else if (lower.includes("linkedin")) platform = "LinkedIn";

  // Detect video type
  let videoType = "ugc_ad";
  if (lower.includes("testimonial") || lower.includes("review")) videoType = "testimonial";
  else if (lower.includes("how-to") || lower.includes("tutorial") || lower.includes("how to")) videoType = "tutorial";
  else if (lower.includes("hook") || lower.includes("viral")) videoType = "hook_cta";

  // Detect provider preference
  let provider = "heygen";
  if (lower.includes("premium") || lower.includes("cinematic") || lower.includes("high quality") || lower.includes("high-quality")) {
    provider = "veo3";
  } else if (lower.includes("realistic") || lower.includes("ultra")) {
    provider = "omnihuman";
  } else if (lower.includes("fast") || lower.includes("quick") || lower.includes("budget")) {
    provider = "hedra_avatar";
  }

  // Detect scene/setting
  let setting = "";
  if (lower.includes("dorm") || lower.includes("bedroom")) setting = "in a cozy dorm room";
  else if (lower.includes("kitchen") || lower.includes("cooking")) setting = "in a bright kitchen";
  else if (lower.includes("gym") || lower.includes("fitness")) setting = "at the gym";
  else if (lower.includes("office") || lower.includes("work")) setting = "in a modern office";
  else if (lower.includes("outdoor") || lower.includes("outside") || lower.includes("park")) setting = "outdoors in natural light";
  else if (lower.includes("studio")) setting = "in a professional studio";
  else setting = "in a natural setting";

  // Generate script based on type
  const scripts: Record<string, string> = {
    ugc_ad: `Okay wait, you NEED to hear about this. So I've been using ${productName} for like two weeks now and honestly? Game changer. I was super skeptical at first but the results speak for themselves. Like, look at this — ${setting.replace("in a ", "I'm here ")} and I literally can't stop talking about it. If you haven't tried ${productName} yet, what are you even doing? Link in bio, trust me on this one.`,
    testimonial: `So I want to be completely honest with you about my experience with ${productName}. I've tried so many products like this before, and most of them just didn't deliver. But ${productName}? It actually works. After using it consistently, I've noticed a real difference. I'm not getting paid to say this — I genuinely think if you're looking for something that works, ${productName} is worth trying. Check it out, link below.`,
    tutorial: `Hey! Today I'm going to show you exactly how to use ${productName} step by step. First, you want to start with... okay so this is the key part — most people get this wrong. With ${productName}, you want to make sure you're doing it like this. See the difference? That's what makes ${productName} so special. Follow for more tips, and grab yours from the link in bio!`,
    hook_cta: `Stop scrolling — this is the product you didn't know you needed. ${productName} just changed everything for me. I'm not even exaggerating. Three reasons why: first, it actually works. Second, the quality is insane for the price. And third? Look at these results. I've never recommended something this hard. ${productName}, link in bio, go go go!`,
  };

  const script = scripts[videoType] || scripts.ugc_ad;

  const actions = [
    {
      type: "configure_node",
      payload: { nodeType: "product", data: { name: productName, description: productDesc } },
      label: `Set product: ${productName}`,
    },
    {
      type: "configure_node",
      payload: { nodeType: "script", data: { generatedContent: script, content: script } },
      label: "Generated script",
    },
    {
      type: "configure_node",
      payload: { nodeType: "provider", data: { provider } },
      label: `Selected ${provider}`,
    },
    {
      type: "configure_node",
      payload: { nodeType: "captions", data: { enabled: true } },
      label: "Enabled captions",
    },
    {
      type: "configure_node",
      payload: {
        nodeType: "output",
        data: { campaignName: `${productName} ${platform} ${videoType.replace("_", " ")}` },
      },
      label: "Named campaign",
    },
  ];

  const providerLabel =
    provider === "veo3" ? "VEO 3 (premium)"
    : provider === "omnihuman" ? "OmniHuman (ultra-realistic)"
    : provider === "hedra_avatar" ? "Hedra (fast & affordable)"
    : "HeyGen (reliable)";

  return {
    message: `Here's what I built for you:\n\n- Product: **${productName}**\n- Style: ${tone} ${videoType.replace("_", " ")} for ${platform}\n- Setting: ${setting}\n- Engine: ${providerLabel}\n- Captions: Enabled (TikTok-style)\n\nI've generated a ${tone} script that opens with a strong hook. You can edit it by clicking the Script node on the canvas.\n\nSelect an avatar and voice, then hit Generate when you're ready!`,
    actions,
  };
}
