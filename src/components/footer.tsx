import { Infinity } from "@phosphor-icons/react/dist/ssr";

const footerLinks = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Pricing", href: "#pricing" },
    { label: "AI Agent", href: "#features" },
    { label: "API Docs", href: "#" },
  ],
  Company: [
    { label: "About", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Careers", href: "#" },
    { label: "Contact", href: "mailto:hello@infiniteugc.com" },
  ],
  Legal: [
    { label: "Terms of Service", href: "#" },
    { label: "Privacy Policy", href: "#" },
    { label: "Refund Policy", href: "#" },
    { label: "Fair Use Policy", href: "#" },
  ],
  Connect: [
    { label: "Twitter / X", href: "#" },
    { label: "LinkedIn", href: "#" },
    { label: "Instagram", href: "#" },
    { label: "YouTube", href: "#" },
  ],
};

export default function Footer() {
  return (
    <footer className="border-t border-glass-border bg-zinc-50/80 backdrop-blur-sm">
      <div className="max-w-350 mx-auto px-6 lg:px-12 py-16 md:py-20">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 md:gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <a href="#" className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 bg-zinc-950 rounded-xl flex items-center justify-center">
                <Infinity size={18} weight="bold" className="text-white" />
              </div>
              <span className="text-base font-bold tracking-tight text-zinc-950">
                InfiniteUGC
              </span>
            </a>
            <p className="text-sm text-zinc-500 leading-relaxed max-w-[28ch]">
              Mass AI video generation for brands that move fast.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-sm font-semibold text-zinc-950 mb-4">
                {title}
              </h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-16 pt-6 border-t border-zinc-200/50 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-zinc-400">
            &copy; {new Date().getFullYear()} InfiniteUGC. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <a
              href="#"
              className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              Terms
            </a>
            <a
              href="#"
              className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              Privacy
            </a>
            <a
              href="#"
              className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              Cookies
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
