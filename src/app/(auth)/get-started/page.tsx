"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Envelope,
  Lock,
  User,
  GoogleLogo,
  ArrowRight,
  Check,
} from "@phosphor-icons/react";

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: "$29",
    period: "/mo",
    features: ["500 credits/mo", "5 AI Avatars", "Basic voices", "720p exports"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$99",
    period: "/mo",
    popular: true,
    features: ["5,000 credits/mo", "25 AI Avatars", "Voice cloning", "1080p exports", "Priority queue"],
  },
  {
    id: "scale",
    name: "Scale",
    price: "$299",
    period: "/mo",
    features: ["25,000 credits/mo", "Unlimited Avatars", "Premium voices", "4K exports", "API access", "Dedicated support"],
  },
];

export default function GetStarted() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("pro");

  return (
    <div className="w-full max-w-2xl">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {[1, 2].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                s === step
                  ? "bg-zinc-950 text-white"
                  : s < step
                  ? "bg-emerald-500 text-white"
                  : "bg-zinc-100 text-zinc-400"
              }`}
            >
              {s < step ? <Check size={14} weight="bold" /> : s}
            </div>
            {s < 2 && (
              <div className={`w-12 h-0.5 rounded-full ${s < step ? "bg-emerald-500" : "bg-zinc-200"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Account */}
      {step === 1 && (
        <div className="max-w-sm mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-zinc-950 tracking-tight">Create your account</h1>
            <p className="text-sm text-zinc-400 mt-1">Start creating AI-powered video content</p>
          </div>

          {/* Google OAuth */}
          <button className="w-full flex items-center justify-center gap-2.5 bg-white border border-zinc-200 rounded-xl px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 transition-all">
            <GoogleLogo size={18} weight="bold" />
            Continue with Google
          </button>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-zinc-200" />
            <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-zinc-200" />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setStep(2);
            }}
            className="space-y-3"
          >
            <div>
              <label className="text-[11px] font-medium text-zinc-500 mb-1.5 block">Full Name</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition-all placeholder:text-zinc-300"
                />
              </div>
            </div>
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
              <label className="text-[11px] font-medium text-zinc-500 mb-1.5 block">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition-all placeholder:text-zinc-300"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-zinc-950 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-zinc-800 transition-colors mt-4"
            >
              Continue
              <ArrowRight size={14} weight="bold" />
            </button>
          </form>

          <p className="text-center text-xs text-zinc-400 mt-6">
            Already have an account?{" "}
            <Link href="/sign-in" className="font-semibold text-sky-600 hover:text-sky-700 transition-colors">
              Sign In
            </Link>
          </p>
        </div>
      )}

      {/* Step 2: Plan Selection */}
      {step === 2 && (
        <div>
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-zinc-950 tracking-tight">Choose your plan</h1>
            <p className="text-sm text-zinc-400 mt-1">Start with a 7-day free trial. Cancel anytime.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {PLANS.map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`relative text-left p-5 rounded-2xl border-2 transition-all ${
                  selectedPlan === plan.id
                    ? "border-zinc-950 bg-white shadow-lg"
                    : "border-zinc-200 bg-white hover:border-zinc-300"
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white bg-zinc-950 px-3 py-0.5 rounded-full uppercase tracking-wider">
                    Popular
                  </span>
                )}
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">{plan.name}</p>
                <p className="text-2xl font-bold text-zinc-950">
                  {plan.price}
                  <span className="text-sm font-medium text-zinc-400">{plan.period}</span>
                </p>
                <ul className="mt-4 space-y-1.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-zinc-600">
                      <Check size={12} weight="bold" className="text-emerald-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between max-w-sm mx-auto">
            <button
              onClick={() => setStep(1)}
              className="text-sm font-medium text-zinc-500 hover:text-zinc-700 transition-colors"
            >
              Back
            </button>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 bg-zinc-950 text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-zinc-800 transition-colors"
            >
              Start Free Trial
              <ArrowRight size={14} weight="bold" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
