import { createBrowserClient } from "@supabase/ssr";

let client: ReturnType<typeof createBrowserClient> | null = null;

// Build-time placeholder — only used during static prerendering when env vars
// aren't available.  NEXT_PUBLIC_* vars are inlined at build time by Next.js,
// so on Vercel (where they're set) the real values get baked into the bundle
// and this placeholder is never reached.
const BUILD_PLACEHOLDER_URL = "https://placeholder.supabase.co";
const BUILD_PLACEHOLDER_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MjAwMDAwMDAwMH0.placeholder";

export function getSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Real env vars available — use cached singleton
  if (url && key) {
    if (!client) {
      client = createBrowserClient(url, key);
    }
    return client;
  }

  // Static prerender without env vars — return throwaway (never cached)
  return createBrowserClient(BUILD_PLACEHOLDER_URL, BUILD_PLACEHOLDER_KEY);
}
