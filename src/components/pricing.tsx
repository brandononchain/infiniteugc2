"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { Check, ArrowRight } from "@phosphor-icons/react";

const plans = [
  {
    name: "Starter",
    monthlyPrice: 49,
    yearlyPrice: 39,
    desc: "For creators and small brands getting started with AI video.",
    features: [
      "50 AI videos per month",
      "300+ AI avatars",
      "50+ languages",
      "Fast 2-min processing",
      "Captions & text overlays",
      "Video editor",
      "Image generation",
      "Standard export formats",
    ],
    cta: "Start Creating",
    accent: false,
  },
  {
    name: "Growth",
    monthlyPrice: 99,
    yearlyPrice: 79,
    desc: "For performance teams testing at scale and shipping weekly.",
    features: [
      "250 AI videos per month",
      "Everything in Starter",
      "Batch mode",
      "AI voice cloning",
      "Custom campaigns",
      "Script templates",
      "Priority rendering",
      "AI Agent access",
    ],
    cta: "Start Creating",
    accent: true,
    badge: "Most Popular",
  },
  {
    name: "Enterprise",
    monthlyPrice: null,
    yearlyPrice: null,
    desc: "For agencies and brands that need unlimited volume and API access.",
    features: [
      "Unlimited videos",
      "Everything in Growth",
      "Custom AI avatars",
      "API access",
      "Dedicated account manager",
      "Auto social posting",
      "White-label export",
      "SLA & priority support",
    ],
    cta: "Talk to Sales",
    accent: false,
  },
];

export default function Pricing() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing" className="py-24 md:py-32 bg-zinc-50/60" ref={ref}>
      <div className="max-w-350 mx-auto px-6 lg:px-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          className="text-center mb-12"
        >
          <p className="text-sm font-medium text-accent-600 uppercase tracking-wider mb-3">
            Pricing
          </p>
          <h2 className="text-3xl md:text-5xl tracking-tighter font-bold text-zinc-950">
            Simple Pricing, Serious Results
          </h2>
          <p className="text-lg text-zinc-500 mt-4 max-w-[45ch] mx-auto">
            Choose the plan that matches your content velocity. Upgrade or cancel
            anytime.
          </p>
        </motion.div>

        {/* Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.1 }}
          className="flex items-center justify-center gap-3 mb-14"
        >
          <span
            className={`text-sm font-medium ${
              !annual ? "text-zinc-950" : "text-zinc-400"
            }`}
          >
            Monthly
          </span>
          <button
            onClick={() => setAnnual(!annual)}
            className="relative w-12 h-6 rounded-full bg-zinc-200/60 backdrop-blur-sm border border-white/40 transition-colors"
            style={{ backgroundColor: annual ? "rgba(37, 99, 235, 0.85)" : undefined }}
          >
            <motion.div
              layout
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm"
              style={{ left: annual ? "calc(100% - 22px)" : "2px" }}
            />
          </button>
          <span
            className={`text-sm font-medium ${
              annual ? "text-zinc-950" : "text-zinc-400"
            }`}
          >
            Annual
          </span>
          {annual && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-xs font-semibold text-accent-600 bg-accent-50 border border-accent-200/40 px-2.5 py-1 rounded-full"
            >
              Save 20%
            </motion.span>
          )}
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 40 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{
                type: "spring",
                stiffness: 100,
                damping: 20,
                delay: 0.15 + i * 0.1,
              }}
              className={`relative rounded-(--radius-card-lg) border p-7 md:p-8 flex flex-col ${
                plan.accent
                  ? "bg-zinc-950 text-white border-zinc-800 shadow-2xl shadow-zinc-950/20 md:scale-105 md:-my-4 z-10"
                  : "bg-glass-white backdrop-blur-xl text-zinc-950 border-glass-border shadow-(--shadow-glass)"
              }`}
            >
              {/* Badge */}
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="btn-ice text-xs font-semibold text-white px-4 py-1.5 rounded-full shadow-(--shadow-accent-glow)">
                    {plan.badge}
                  </span>
                </div>
              )}

              {/* Plan name */}
              <h3
                className={`text-lg font-bold ${
                  plan.accent ? "text-white" : "text-zinc-950"
                }`}
              >
                {plan.name}
              </h3>
              <p
                className={`text-sm mt-1 ${
                  plan.accent ? "text-zinc-400" : "text-zinc-500"
                }`}
              >
                {plan.desc}
              </p>

              {/* Price */}
              <div className="mt-6 mb-6">
                {plan.monthlyPrice ? (
                  <div className="flex items-baseline gap-1">
                    <span
                      className={`text-4xl font-bold font-mono tabular-nums ${
                        plan.accent ? "text-white" : "text-zinc-950"
                      }`}
                    >
                      ${annual ? plan.yearlyPrice : plan.monthlyPrice}
                    </span>
                    <span
                      className={`text-sm ${
                        plan.accent ? "text-zinc-400" : "text-zinc-500"
                      }`}
                    >
                      /mo
                    </span>
                  </div>
                ) : (
                  <span
                    className={`text-2xl font-bold ${
                      plan.accent ? "text-white" : "text-zinc-950"
                    }`}
                  >
                    Custom
                  </span>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-3 flex-1 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <Check
                      size={16}
                      weight="bold"
                      className={`mt-0.5 shrink-0 ${
                        plan.accent ? "text-accent-400" : "text-accent-600"
                      }`}
                    />
                    <span
                      className={`text-sm ${
                        plan.accent ? "text-zinc-300" : "text-zinc-600"
                      }`}
                    >
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <a
                href="#"
                className={`inline-flex items-center justify-center gap-2 font-semibold text-sm px-6 py-3 rounded-full transition-all active:scale-[0.97] ${
                  plan.accent
                    ? "btn-ice shadow-(--shadow-accent-glow-lg)"
                    : "bg-zinc-950/90 hover:bg-zinc-900 text-white backdrop-blur-sm"
                }`}
              >
                {plan.cta}
                <ArrowRight size={14} weight="bold" />
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
