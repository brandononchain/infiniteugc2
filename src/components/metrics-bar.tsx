"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";

interface Metric {
  value: string;
  suffix: string;
  label: string;
  numericTarget: number;
}

const metrics: Metric[] = [
  {
    value: "10,000",
    suffix: "+",
    label: "Videos Generated Daily",
    numericTarget: 10000,
  },
  {
    value: "3.2",
    suffix: "x",
    label: "Average ROAS",
    numericTarget: 3.2,
  },
  {
    value: "< 2",
    suffix: " min",
    label: "Generation Time",
    numericTarget: 2,
  },
  {
    value: "50",
    suffix: "+",
    label: "Languages Supported",
    numericTarget: 50,
  },
];

function CountUp({
  target,
  suffix,
  isDecimal,
  inView,
}: {
  target: number;
  suffix: string;
  isDecimal: boolean;
  inView: boolean;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;

    const duration = 2000;
    const startTime = performance.now();

    function animate(currentTime: number) {
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(target * eased);
      if (progress < 1) requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
  }, [inView, target]);

  const display = isDecimal
    ? count.toFixed(1)
    : target >= 1000
    ? Math.floor(count).toLocaleString()
    : target < 10
    ? `< ${Math.ceil(count)}`
    : Math.floor(count).toString();

  return (
    <span className="font-mono text-3xl md:text-4xl font-bold text-zinc-950 tabular-nums">
      {display}
      <span className="text-accent-600">{suffix}</span>
    </span>
  );
}

export default function MetricsBar() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="relative border-y border-glass-border bg-glass-white backdrop-blur-xl">
      <div className="max-w-350 mx-auto px-6 lg:px-12 py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {metrics.map((metric, i) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{
                type: "spring",
                stiffness: 100,
                damping: 20,
                delay: i * 0.1,
              }}
              className="text-center md:text-left"
            >
              <CountUp
                target={metric.numericTarget}
                suffix={metric.suffix}
                isDecimal={metric.numericTarget % 1 !== 0}
                inView={inView}
              />
              <p className="text-sm text-zinc-500 mt-1.5 font-medium">
                {metric.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
