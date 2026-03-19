/**
 * Fetch wrapper with timeout support using AbortController.
 * Prevents downloads from hanging forever when CDNs stall.
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { timeoutMs = 120_000, ...fetchOptions } = options; // default 2 minutes

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    return response;
  } catch (error: any) {
    if (error.name === "AbortError") {
      throw new Error(
        `Download timed out after ${Math.round(timeoutMs / 1000)}s: ${url.substring(0, 100)}...`
      );
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Default timeout for video file downloads (5 minutes) */
export const VIDEO_DOWNLOAD_TIMEOUT_MS = 300_000;

/** Default timeout for image downloads (60 seconds) */
export const IMAGE_DOWNLOAD_TIMEOUT_MS = 60_000;
