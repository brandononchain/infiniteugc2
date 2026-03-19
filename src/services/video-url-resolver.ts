/**
 * Video URL Resolver Service
 *
 * Resolves social media video URLs (TikTok, YouTube Shorts, Instagram Reels, etc.)
 * to direct downloadable MP4 URLs using pure Node.js fetch — no binary dependencies.
 *
 * Strategy per platform:
 *   - TikTok: Uses tikwm.com API (free, no auth)
 *   - YouTube/Shorts: Scrapes the embed page for the direct stream URL
 *   - Instagram Reels: Scrapes the page for og:video meta tag
 *   - Others: Falls back to fetching the page and looking for video URLs
 *
 * If the URL is already a direct video link, it passes through unchanged.
 */

const MOBILE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

// ─── Platform detection ─────────────────────────────────────────────

function isTikTok(url: string): boolean {
  return /tiktok\.com/i.test(url);
}

function isYouTube(url: string): boolean {
  return /youtube\.com|youtu\.be/i.test(url);
}

function isInstagram(url: string): boolean {
  return /instagram\.com/i.test(url);
}

function needsResolution(url: string): boolean {
  return [
    /tiktok\.com/i,
    /youtube\.com/i,
    /youtu\.be/i,
    /instagram\.com/i,
    /facebook\.com/i,
    /fb\.watch/i,
    /twitter\.com/i,
    /x\.com/i,
    /vimeo\.com/i,
  ].some((p) => p.test(url));
}

// ─── TikTok resolver (tikwm.com API) ───────────────────────────────

async function resolveTikTok(url: string): Promise<string> {
  console.log(`[VideoResolver] Resolving TikTok via tikwm API...`);

  const response = await fetch("https://www.tikwm.com/api/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ url, hd: "1" }),
  });

  if (!response.ok) {
    throw new Error(`tikwm API returned ${response.status}`);
  }

  const json = await response.json() as any;

  if (json.code !== 0 || !json.data) {
    throw new Error(`tikwm API error: ${json.msg || "unknown error"}`);
  }

  // Prefer HD, fall back to standard
  const videoPath = json.data.hdplay || json.data.play;
  if (!videoPath) {
    throw new Error("tikwm returned no video URL");
  }

  // tikwm returns paths relative to their CDN or full URLs
  const directUrl = videoPath.startsWith("http")
    ? videoPath
    : `https://www.tikwm.com${videoPath}`;

  return directUrl;
}

// ─── YouTube resolver (scrape page for stream URL) ─────────────────

async function resolveYouTube(url: string): Promise<string> {
  console.log(`[VideoResolver] Resolving YouTube video...`);

  // Normalize shorts / youtu.be URLs
  let videoId: string | null = null;
  const shortsMatch = url.match(/shorts\/([a-zA-Z0-9_-]+)/);
  const standardMatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
  const shortUrlMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  videoId = shortsMatch?.[1] || standardMatch?.[1] || shortUrlMatch?.[1] || null;

  if (!videoId) {
    throw new Error("Could not extract YouTube video ID from URL");
  }

  // Fetch the embed page — it's lighter and has the player config
  const embedUrl = `https://www.youtube.com/embed/${videoId}`;
  const response = await fetch(embedUrl, {
    headers: { "User-Agent": MOBILE_UA },
  });
  const html = await response.text();

  // Extract streaming URLs from the embedded player config
  const streamMatch = html.match(/"url":"(https:\/\/[^"]*?googlevideo\.com[^"]*?)"/);
  if (streamMatch) {
    const streamUrl = JSON.parse(`"${streamMatch[1]}"`); // unescape
    return streamUrl;
  }

  // Fallback: try to get a playable URL from the oembed thumbnail and construct a direct link
  throw new Error(
    "Could not extract YouTube stream URL. YouTube videos may require authentication — try providing a direct video file URL instead."
  );
}

// ─── Instagram resolver (scrape og:video) ──────────────────────────

async function resolveInstagram(url: string): Promise<string> {
  console.log(`[VideoResolver] Resolving Instagram video...`);

  const response = await fetch(url, {
    headers: {
      "User-Agent": MOBILE_UA,
      Accept: "text/html",
    },
    redirect: "follow",
  });
  const html = await response.text();

  // Look for og:video meta tag
  const ogMatch = html.match(/<meta\s+property="og:video"\s+content="([^"]+)"/i) ||
    html.match(/<meta\s+content="([^"]+)"\s+property="og:video"/i);

  if (ogMatch) {
    return ogMatch[1].replace(/&amp;/g, "&");
  }

  // Try to find video URL in the page's JSON data
  const jsonMatch = html.match(/"video_url":"([^"]+)"/);
  if (jsonMatch) {
    return JSON.parse(`"${jsonMatch[1]}"`);
  }

  throw new Error(
    "Could not extract Instagram video URL. The post may be private — try providing a direct video file URL instead."
  );
}

// ─── Generic fallback (follow redirects, check og:video) ───────────

async function resolveGeneric(url: string): Promise<string> {
  console.log(`[VideoResolver] Attempting generic resolution...`);

  const response = await fetch(url, {
    headers: { "User-Agent": MOBILE_UA },
    redirect: "follow",
  });

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("video/")) {
    // The URL itself serves video — use the final URL after redirects
    return response.url;
  }

  const html = await response.text();

  // Try og:video
  const ogMatch = html.match(/<meta\s+(?:property="og:video"\s+content="([^"]+)"|content="([^"]+)"\s+property="og:video")/i);
  if (ogMatch) {
    return (ogMatch[1] || ogMatch[2]).replace(/&amp;/g, "&");
  }

  throw new Error(
    "Could not resolve video URL. This platform may not be supported — try providing a direct video file URL instead."
  );
}

// ─── Main export ────────────────────────────────────────────────────

/**
 * Resolve a social media video URL to a direct downloadable URL.
 * If the URL is already a direct video link, returns it unchanged.
 */
export async function resolveVideoUrl(url: string): Promise<string> {
  if (!needsResolution(url)) {
    console.log(`[VideoResolver] URL does not need resolution, passing through: ${url.substring(0, 80)}...`);
    return url;
  }

  console.log(`[VideoResolver] Resolving social media URL: ${url}`);

  try {
    let directUrl: string;

    if (isTikTok(url)) {
      directUrl = await resolveTikTok(url);
    } else if (isYouTube(url)) {
      directUrl = await resolveYouTube(url);
    } else if (isInstagram(url)) {
      directUrl = await resolveInstagram(url);
    } else {
      directUrl = await resolveGeneric(url);
    }

    console.log(`[VideoResolver] Resolved to direct URL: ${directUrl.substring(0, 100)}...`);
    return directUrl;
  } catch (error: any) {
    console.error(`[VideoResolver] Resolution failed: ${error.message}`);
    throw new Error(`Failed to resolve video URL: ${error.message}`);
  }
}
