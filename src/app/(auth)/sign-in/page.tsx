"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Envelope, Lock, GoogleLogo, ArrowRight, CircleNotch } from "@phosphor-icons/react";
import { useAuth } from "@/lib/auth-context";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();

  const handleGoogleSignIn = async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await signIn(email, password);
    setLoading(false);
    if (err) {
      setError(err);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-zinc-950 tracking-tight">Welcome back</h1>
        <p className="text-sm text-zinc-400 mt-1">Sign in to your InfiniteUGC account</p>
      </div>

      {/* Google OAuth */}
      <button
        onClick={handleGoogleSignIn}
        className="w-full flex items-center justify-center gap-2.5 bg-white border border-zinc-200 rounded-xl px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 transition-all"
      >
        <GoogleLogo size={18} weight="bold" />
        Continue with Google
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-zinc-200" />
        <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">or</span>
        <div className="flex-1 h-px bg-zinc-200" />
      </div>

      {/* Email / Password */}
      <form
        onSubmit={handleSubmit}
        className="space-y-3"
      >
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-medium px-3 py-2 rounded-xl">
            {error}
          </div>
        )}
        <div>
          <label className="text-[11px] font-medium text-zinc-500 mb-1.5 block">Email</label>
          <div className="relative">
            <Envelope size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition-all placeholder:text-zinc-300"
            />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-medium text-zinc-500">Password</label>
            <a href="#" className="text-[11px] font-medium text-sky-600 hover:text-sky-700 transition-colors">
              Forgot?
            </a>
          </div>
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition-all placeholder:text-zinc-300"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-zinc-950 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-zinc-800 transition-colors mt-4 disabled:opacity-50"
        >
          {loading ? <CircleNotch size={14} weight="bold" className="animate-spin" /> : null}
          {loading ? "Signing in..." : "Sign In"}
          {!loading && <ArrowRight size={14} weight="bold" />}
        </button>
      </form>

      <p className="text-center text-xs text-zinc-400 mt-6">
        Don&apos;t have an account?{" "}
        <Link href="/get-started" className="font-semibold text-sky-600 hover:text-sky-700 transition-colors">
          Get Started
        </Link>
      </p>
    </div>
  );
}
