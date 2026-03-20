import type { Metadata } from "next";
import "./globals.css";
import { AuthProviderClient } from "@/components/auth-provider-client";

export const metadata: Metadata = {
  title: "InfiniteUGC | AI Video Content at Scale",
  description:
    "Mass-produce studio-quality UGC videos with AI avatars, voice cloning, custom campaigns, and an intelligent AI agent. Built for brands that move fast.",
  openGraph: {
    title: "InfiniteUGC | AI Video Content at Scale",
    description:
      "Generate thousands of AI avatar videos, custom campaigns, and ad creatives, from script to export.",
    type: "website",
    url: "https://infiniteugc.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "InfiniteUGC | AI Video Content at Scale",
    description:
      "Mass-produce studio-quality UGC videos with AI avatars, voice cloning, and an intelligent AI agent.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="antialiased">
        <AuthProviderWrapper>{children}</AuthProviderWrapper>
      </body>
    </html>
  );
}

/* Client wrapper so layout.tsx stays a Server Component for metadata */
function AuthProviderWrapper({ children }: { children: React.ReactNode }) {
  return <AuthProviderClient>{children}</AuthProviderClient>;
}
