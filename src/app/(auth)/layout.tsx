"use client";

import Link from "next/link";
import { Infinity } from "@phosphor-icons/react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col bg-zinc-50">
      {/* Minimal top bar */}
      <header className="flex items-center h-16 px-6 shrink-0">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-zinc-950 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
            <Infinity size={17} weight="bold" className="text-white" />
          </div>
          <span className="text-base font-bold tracking-tight text-zinc-950">InfiniteUGC</span>
        </Link>
      </header>

      {/* Centered content */}
      <main className="flex-1 flex items-center justify-center px-6 pb-16">
        {children}
      </main>
    </div>
  );
}
