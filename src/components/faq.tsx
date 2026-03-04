"use client";

import { motion, AnimatePresence, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { CaretDown } from "@phosphor-icons/react";

const faqs = [
  {
    q: "How fast are videos generated?",
    a: "Standard talking-head videos render in under 2 minutes. AI hook videos process in 5-10 seconds. Batch jobs of 100+ videos typically complete within 30 minutes depending on complexity.",
  },
  {
    q: "How realistic are the AI avatars?",
    a: "Our avatar models are trained on the latest generation of neural rendering. They support natural lip sync, emotion control, and gesture variation. Most viewers cannot distinguish them from real creators in blind tests.",
  },
  {
    q: "Can the AI hold and showcase my physical product?",
    a: "Yes. Upload product images and the AI will generate realistic product-in-hand footage. This feature supports bottles, boxes, devices, clothing, and most standard consumer products.",
  },
  {
    q: "What is the AI Agent and how does it work?",
    a: "The AI Agent is a conversational interface where you describe what you want in plain language. For example, \"Create 30 TikTok testimonials for my skincare line in English and Spanish.\" The agent handles scripting, avatar selection, rendering, and export autonomously.",
  },
  {
    q: "How many languages are supported?",
    a: "Over 50 languages with accurate translation and native-quality lip sync. This includes English, Spanish, French, German, Japanese, Korean, Portuguese, Arabic, Hindi, Mandarin, and more.",
  },
  {
    q: "Can I create a custom AI avatar of myself?",
    a: "Yes. Upload a short video of yourself and we will generate a custom AI avatar that matches your face, expressions, and mannerisms. Custom avatar training typically takes under an hour.",
  },
  {
    q: "Do I own the content I create?",
    a: "Absolutely. You retain full ownership and commercial rights to every video generated on the platform, even after your subscription ends. All stock footage used is royalty-free.",
  },
  {
    q: "Is there an API for enterprise integrations?",
    a: "Yes. Enterprise plans include full API access for programmatic video generation, webhook callbacks, and integration with your existing marketing stack. Full documentation is provided.",
  },
  {
    q: "What is your refund policy?",
    a: "If you sign up and decide the platform is not the right fit before using your video credits, we will issue a full refund, no questions asked. Contact support within 7 days of purchase.",
  },
];

function FAQItem({
  q,
  a,
  isOpen,
  toggle,
}: {
  q: string;
  a: string;
  isOpen: boolean;
  toggle: () => void;
}) {
  return (
    <div className="border-b border-glass-border">
      <button
        onClick={toggle}
        className="flex items-center justify-between w-full py-5 text-left group"
      >
        <span className="text-base font-medium text-zinc-900 pr-8 group-hover:text-zinc-700 transition-colors">
          {q}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          <CaretDown
            size={18}
            weight="bold"
            className="text-zinc-400 shrink-0"
          />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
            className="overflow-hidden"
          >
            <p className="text-sm text-zinc-500 leading-relaxed pb-5 max-w-[65ch]">
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQ() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-24 md:py-32" ref={ref}>
      <div className="max-w-350 mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-12 md:gap-20">
          {/* Left — Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            className="md:sticky md:top-32 md:self-start"
          >
            <p className="text-sm font-medium text-accent-600 uppercase tracking-wider mb-3">
              FAQ
            </p>
            <h2 className="text-3xl md:text-5xl tracking-tighter font-bold text-zinc-950">
              Common Questions
            </h2>
            <p className="text-base text-zinc-500 leading-relaxed mt-4 max-w-[40ch]">
              Everything you need to know about InfiniteUGC. Can&apos;t find
              your answer? Reach out to our team.
            </p>
            <a
              href="mailto:hello@infiniteugc.com"
              className="inline-flex items-center gap-2 text-sm font-semibold text-accent-600 hover:text-accent-700 mt-6 transition-colors"
            >
              Contact Support
            </a>
          </motion.div>

          {/* Right — Accordion */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{
              type: "spring",
              stiffness: 100,
              damping: 20,
              delay: 0.15,
            }}
          >
            {faqs.map((faq, i) => (
              <FAQItem
                key={i}
                q={faq.q}
                a={faq.a}
                isOpen={openIndex === i}
                toggle={() => setOpenIndex(openIndex === i ? null : i)}
              />
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
