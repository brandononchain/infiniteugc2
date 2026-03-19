import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import {
  buildScriptSystemPrompt,
  buildScriptUserPrompt,
  type ScriptTone,
  type ScriptFormat,
  type ScriptPlatform,
  type TargetAudience,
} from "@/lib/prompts";

export const runtime = "nodejs";

/**
 * POST /api/generate-script
 *
 * Server-side AI script generation using GPT-4o.
 * Takes script parameters and returns a high-quality UGC script.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      product,
      tone = "conversational",
      format = "ugc_ad",
      platform = "tiktok",
      audience = "broad",
      duration = "30",
      keyBenefits,
      pricePoint,
      competitorMention,
      extra,
    } = body as {
      product: string;
      tone: ScriptTone;
      format: ScriptFormat;
      platform: ScriptPlatform;
      audience: TargetAudience;
      duration: string;
      keyBenefits?: string;
      pricePoint?: string;
      competitorMention?: string;
      extra?: string;
    };

    if (!product?.trim()) {
      return NextResponse.json(
        { error: "Product or service is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // Fallback: return a high-quality template-generated script
      return NextResponse.json({
        script: generateAdvancedTemplate({
          product,
          tone,
          format,
          platform,
          duration,
          audience,
          extra,
        }),
        source: "template",
      });
    }

    const openai = new OpenAI({ apiKey });

    const systemPrompt = buildScriptSystemPrompt({
      platform,
      audience,
      tone,
      format,
      duration,
    });

    const userPrompt = buildScriptUserPrompt({
      product,
      keyBenefits,
      pricePoint,
      competitorMention,
      extraInstructions: extra,
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.82,
      max_tokens: 1500,
      frequency_penalty: 0.15,
      presence_penalty: 0.1,
    });

    const script = response.choices[0]?.message?.content?.trim();

    if (!script) {
      throw new Error("No script generated");
    }

    return NextResponse.json({ script, source: "ai" });
  } catch (error: unknown) {
    console.error("Script generation error:", error);

    // If OpenAI fails, return template fallback
    try {
      const body = await req.clone().json();
      return NextResponse.json({
        script: generateAdvancedTemplate(body),
        source: "template",
      });
    } catch {
      return NextResponse.json(
        { error: "Failed to generate script" },
        { status: 500 }
      );
    }
  }
}

/* ═══════════════════════════════════════════════════════════════════════════════
   ADVANCED TEMPLATE ENGINE — Used when OpenAI API key is not configured
   This produces high-quality structured scripts using pattern matching.
   ═══════════════════════════════════════════════════════════════════════════════ */

interface TemplateParams {
  product: string;
  tone?: string;
  format?: string;
  platform?: string;
  audience?: string;
  duration?: string;
  extra?: string;
}

function generateAdvancedTemplate(params: TemplateParams): string {
  const product = params.product?.trim() || "this product";
  const dur = parseInt(params.duration || "30");
  const tone = params.tone || "conversational";
  const format = params.format || "ugc_ad";

  // Calculate timestamps based on duration
  const ts = {
    hookEnd: dur <= 15 ? "2s" : "3s",
    problemEnd: dur <= 15 ? "5s" : dur <= 30 ? "8s" : "12s",
    solutionEnd: dur <= 15 ? "10s" : dur <= 30 ? "18s" : dur <= 60 ? "35s" : "50s",
    proofEnd: dur <= 15 ? "12s" : dur <= 30 ? "24s" : dur <= 60 ? "50s" : "70s",
    ctaStart: dur <= 15 ? "12s" : dur <= 30 ? "24s" : dur <= 60 ? "50s" : "70s",
  };

  // Tone-specific language variations
  const toneWords: Record<string, { amazing: string; results: string; trust: string; cta: string }> = {
    conversational: {
      amazing: "genuinely changed everything for me",
      results: "okay so the results? Actually insane.",
      trust: "Thousands of people already swear by this.",
      cta: "Seriously — link is in my bio. Try it.",
    },
    professional: {
      amazing: "delivers measurable results from day one",
      results: "The data speaks for itself — consistent, verified results.",
      trust: "Backed by thousands of verified reviews and clinical data.",
      cta: "Visit the link below to learn more.",
    },
    energetic: {
      amazing: "is LITERALLY the best thing I've ever tried, no exaggeration!",
      results: "And the results?! I was SHOOK. Like genuinely could not believe it!",
      trust: "The reviews are going CRAZY right now — thousands of five-star ratings!",
      cta: "GO! Link in bio! You need this in your life RIGHT NOW!",
    },
    humorous: {
      amazing: "works better than my will to go to the gym — and trust me, that bar was LOW",
      results: "The results came in faster than my Amazon packages, which is saying something.",
      trust: "Even my skeptical friend — you know the one — had to admit it works.",
      cta: "Link in bio. Your future self will high-five you for this one.",
    },
    inspirational: {
      amazing: "was the catalyst I didn't know I needed in my journey",
      results: "When I saw the transformation, I realized anything is possible when you find the right tools.",
      trust: "Join the community of people who chose to invest in themselves.",
      cta: "Your transformation starts with one click. Link in bio.",
    },
    urgent: {
      amazing: "is selling out everywhere and they just restocked — but not for long",
      results: "Results started showing up in the first week. I'm NOT exaggerating.",
      trust: "Over 10,000 sold in the last 48 hours alone.",
      cta: "Link in bio — this deal expires tonight. Don't miss it.",
    },
    empathetic: {
      amazing: "finally gave me the relief I'd been searching for after trying everything else",
      results: "And honestly? For the first time in a long time, I felt like myself again.",
      trust: "Hearing other people share the same experience — it hit different.",
      cta: "If you're going through the same thing, just try it. Link in bio.",
    },
    authoritative: {
      amazing: "outperformed every competitor I tested in my comprehensive evaluation",
      results: "After rigorous testing across multiple conditions, the results were conclusive.",
      trust: "Recommended by dermatologists, endorsed by 50,000+ verified users.",
      cta: "See the full breakdown and get yours via the link below.",
    },
  };

  const tw = toneWords[tone] || toneWords.conversational;

  // Format-specific templates
  if (format === "hook_cta" || format === "hook-cta") {
    return `[HOOK — 0-2s]
"Wait — you haven't tried ${product} yet?"
[BEAT]

[QUICK PROOF — 2-6s]
"This is the one thing that ${tw.amazing}."
(Show product quickly, close-up detail)

[CTA — 6-${dur}s]
"${tw.cta}"`;
  }

  if (format === "problem_solution" || format === "problem-solution") {
    return `[HOOK / PROBLEM — 0-${ts.hookEnd}]
"If you're still struggling with this, I need you to hear me out."
(Direct to camera, genuine concern)

[AGITATE — ${ts.hookEnd}-${ts.problemEnd}]
"I literally tried everything. Spent hundreds of dollars on things that didn't work. And the worst part? I almost gave up."
[BEAT]

[SOLUTION — ${ts.problemEnd}-${ts.solutionEnd}]
"Then someone told me about ${product} and honestly? It ${tw.amazing}."
(Show product — hands-on, close-up, natural environment)
"Like, I'm not even kidding right now."

[PROOF — ${ts.solutionEnd}-${ts.proofEnd}]
"${tw.results}"
(Before/after or results demonstration)

[CTA — ${ts.ctaStart}-${dur}s]
"${tw.cta}"`;
  }

  if (format === "testimonial") {
    return `[HOOK — 0-${ts.hookEnd}]
"I need to tell you something about ${product} because nobody else is being this honest."
(Direct to camera, raw and real)

[BACKSTORY — ${ts.hookEnd}-${ts.problemEnd}]
"So a few months ago, I was in a really frustrating place. I'd tried everything and nothing was working. I was honestly about to give up."
[PAUSE]

[TURNING POINT — ${ts.problemEnd}-${ts.solutionEnd}]
"Then my friend literally would not stop talking about ${product}. And I was skeptical — like extremely skeptical. But I figured, what do I have to lose?"
(Show product naturally, real environment)

[RESULTS — ${ts.solutionEnd}-${ts.proofEnd}]
"${tw.results}"
"It ${tw.amazing}. And I don't say that lightly."

[RECOMMENDATION — ${ts.proofEnd}-${dur}s]
"${tw.trust}"
"${tw.cta}"`;
  }

  if (format === "how_to" || format === "how-to") {
    return `[HOOK — 0-${ts.hookEnd}]
"Here's how to get the most out of ${product} — this is the method nobody talks about."

[STEP 1 — ${ts.hookEnd}-${ts.problemEnd}]
"Step one — start by using it first thing in the morning. This is when it's most effective."
(Show step one visually)

[STEP 2 — ${ts.problemEnd}-${ts.solutionEnd}]
"Step two — and this is the game-changer — pair it with your existing routine. Like, it just fits in."
(Demonstrate step two)
"Which sounds simple but trust me, this is where the magic happens."

[RESULT — ${ts.solutionEnd}-${ts.proofEnd}]
"${tw.results}"
(Show the impressive outcome)

[CTA — ${ts.proofEnd}-${dur}s]
"${tw.cta}"`;
  }

  // Default: UGC Ad format
  return `[HOOK — 0-${ts.hookEnd}]
"Okay stop scrolling — I need to talk about ${product} because this is genuinely different."
(Direct to camera, casual and authentic)
[BEAT]

[PROBLEM — ${ts.hookEnd}-${ts.problemEnd}]
"So I've been dealing with this problem for months. Tried like five different things, spent way too much money, and honestly? Nothing was cutting it."
(Natural gestures, relatable frustration)

[DISCOVERY — ${ts.problemEnd}-${ts.solutionEnd}]
"Then I found ${product} — and like, it ${tw.amazing}."
(Show product — hold it up, hands-on demonstration)
"The quality is actually wild for the price. Like where has this been my whole life?"

[SOCIAL PROOF — ${ts.solutionEnd}-${ts.proofEnd}]
"${tw.trust}"
"${tw.results}"
(Show results, reviews, or before/after if applicable)

[CTA — ${ts.ctaStart}-${dur}s]
"${tw.cta}"`;
}
