"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

export interface TimelineEntry {
  title: string;      // left sticky column
  content: React.ReactNode;
}

export function Timeline({ data }: { data: TimelineEntry[] }) {
  const ref          = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (!ref.current) return;
    const measure = () => setHeight(ref.current?.getBoundingClientRect().height ?? 0);
    measure();
    const obs = new ResizeObserver(measure);
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 10%", "end 50%"],
  });

  const lineHeight  = useTransform(scrollYProgress, [0, 1], [0, height]);
  const lineOpacity = useTransform(scrollYProgress, [0, 0.05], [0, 1]);

  return (
    <div ref={containerRef} className="relative w-full">
      <div ref={ref} className="relative">
        {data.map((item, idx) => (
          <div key={idx} className="flex justify-start pt-10 md:pt-14 md:gap-10">

            {/* ── Left sticky column ─────────────────────────────── */}
            <div className="sticky top-20 z-10 self-start flex flex-col md:flex-row items-center max-w-20 md:max-w-45 md:w-full shrink-0">
              {/* Dot */}
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "var(--bg)" }}>
                <div className="w-3.5 h-3.5 rounded-full"
                  style={{
                    background: "var(--accent)",
                    boxShadow: "0 0 0 4px color-mix(in srgb, var(--accent) 18%, transparent)",
                  }} />
              </div>
              {/* Date label (desktop) */}
              <p className="hidden md:block text-[11px] font-semibold text-(--muted) md:pl-3 leading-snug text-center md:text-left whitespace-pre-line">
                {item.title}
              </p>
            </div>

            {/* ── Right content ──────────────────────────────────── */}
            <div className="relative flex-1 pb-12 pl-2 pr-1 md:pl-0">
              {/* Date label (mobile) */}
              <p className="md:hidden text-[10px] font-semibold text-(--muted) mb-2">{item.title}</p>
              {item.content}
            </div>
          </div>
        ))}

        {/* ── Vertical track + animated fill ─────────────────────── */}
        <div
          className="absolute left-4.5 top-0 w-0.5 overflow-hidden pointer-events-none"
          style={{
            height: `${height}px`,
            background: `linear-gradient(to bottom, transparent 0%, var(--border) 8%, var(--border) 92%, transparent 100%)`,
          }}
        >
          <motion.div
            style={{
              height: lineHeight,
              opacity: lineOpacity,
            }}
            className="absolute inset-x-0 top-0 rounded-full"
            // inline style because we need a CSS gradient not a tailwind class
            // framer merges motion style + style prop fine
          >
            {/* inner gradient via separate element to avoid framer-style conflict */}
            <div className="w-full h-full rounded-full" style={{
              background: "linear-gradient(to bottom, var(--accent), color-mix(in srgb, var(--accent) 25%, transparent))",
            }} />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
