"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { List, X, Infinity } from "@phosphor-icons/react";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* Spacer so the fixed nav doesn't overlap hero on small viewports */}
      <div className="h-0" />

      <nav className="fixed top-0 left-0 right-0 z-40 flex justify-center pointer-events-none">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 120, damping: 20, delay: 0.1 }}
          className={`pointer-events-auto w-[calc(100%-2rem)] max-w-4xl mt-4 transition-all duration-500 ${
            scrolled
              ? "bg-white/75 shadow-[0_4px_24px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)] border border-white/60"
              : "bg-white/50 border border-white/40"
          } backdrop-blur-2xl backdrop-saturate-150 rounded-2xl`}
        >
          <div className="flex items-center justify-between px-5 sm:px-6 h-14">
            {/* Logo */}
            <a href="#" className="flex items-center gap-2 group shrink-0">
              <div className="w-8 h-8 bg-zinc-950 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                <Infinity size={17} weight="bold" className="text-white" />
              </div>
              <span className="text-base font-bold tracking-tight text-zinc-950">
                InfiniteUGC
              </span>
            </a>

            {/* Desktop Nav Links */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-[13px] font-medium text-zinc-500 hover:text-zinc-950 transition-colors px-3.5 py-1.5 rounded-lg hover:bg-zinc-950/[0.04]"
                >
                  {link.label}
                </a>
              ))}
            </div>

            {/* Desktop CTA */}
            <div className="hidden md:flex items-center gap-3 shrink-0">
              <a
                href="#"
                className="text-[13px] font-medium text-zinc-500 hover:text-zinc-950 transition-colors px-3 py-1.5"
              >
                Sign In
              </a>
              <a
                href="#"
                className="btn-ice inline-flex items-center gap-1.5 text-white text-[13px] font-semibold px-5 py-2 rounded-xl transition-all active:scale-[0.97] shadow-(--shadow-accent-glow)"
              >
                Get Started
              </a>
            </div>

            {/* Mobile Toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 -mr-2 text-zinc-600 hover:text-zinc-950 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={22} /> : <List size={22} />}
            </button>
          </div>
        </motion.div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm md:hidden"
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="fixed left-4 right-4 top-[5.5rem] z-40 bg-white/90 backdrop-blur-2xl backdrop-saturate-150 border border-white/60 shadow-[0_8px_40px_rgba(0,0,0,0.08)] rounded-2xl overflow-hidden md:hidden"
            >
              <div className="flex flex-col p-4 gap-1">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="text-[15px] font-medium text-zinc-700 hover:text-zinc-950 hover:bg-zinc-950/[0.04] transition-colors py-2.5 px-3 rounded-xl"
                  >
                    {link.label}
                  </a>
                ))}
                <div className="flex flex-col gap-2 pt-3 mt-2 border-t border-zinc-200/50">
                  <a
                    href="#"
                    className="text-[15px] font-medium text-zinc-500 text-center py-2.5 hover:text-zinc-950 transition-colors"
                  >
                    Sign In
                  </a>
                  <a
                    href="#"
                    className="btn-ice inline-flex items-center justify-center text-white text-[15px] font-semibold px-5 py-2.5 rounded-xl transition-all active:scale-[0.97] shadow-(--shadow-accent-glow)"
                  >
                    Get Started
                  </a>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
