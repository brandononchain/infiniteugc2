import type { Metadata } from "next";
import { Outfit, Geist_Mono } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
      <body
        className={`${outfit.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
