"use client";

import Link from "next/link";
import { useRef } from "react";

interface Props {
  href?: string;
  icon?: React.ReactNode;
  title: string;
  description?: string;
  accent?: string;          // CSS color
  size?: "sm" | "md" | "lg";
  children?: React.ReactNode;
  onClick?: () => void;
}

/**
 * Bento-style card with cursor-tracking spotlight (Aceternity-inspired).
 * Wraps in <Link> when href is provided, otherwise renders a div / button.
 */
export default function BentoCard({
  href, icon, title, description,
  accent = "var(--accent)",
  size = "md", children, onClick,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  function onMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
  }

  const padding = size === "sm" ? "p-4" : size === "lg" ? "p-7" : "p-5";

  const inner = (
    <div ref={ref} onMouseMove={onMove}
      className={`relative overflow-hidden rounded-2xl glass ${padding} transition-all duration-200 hover:border-(--accent)/40 group`}
      style={{ boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04), 0 12px 32px -12px rgba(15, 23, 42, 0.06)" }}>
      {/* spotlight */}
      <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `radial-gradient(220px circle at var(--mx, 50%) var(--my, 50%), color-mix(in srgb, ${accent} 12%, transparent), transparent 70%)`,
        }} />
      {/* border glow */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `linear-gradient(135deg, color-mix(in srgb, ${accent} 30%, transparent), transparent 60%)`,
          maskImage: "linear-gradient(black, black) content-box, linear-gradient(black, black)",
          maskComposite: "exclude",
          WebkitMaskComposite: "xor",
          padding: "1px",
        }} />

      <div className="relative">
        {(icon || title) && (
          <div className="flex items-start gap-3 mb-2">
            {icon && (
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                style={{ background: `color-mix(in srgb, ${accent} 12%, transparent)`, color: accent }}>
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <h3 className="font-semibold text-(--text) leading-tight">{title}</h3>
              {description && <p className="text-xs text-(--muted) mt-0.5">{description}</p>}
            </div>
          </div>
        )}
        {children}
      </div>
    </div>
  );

  if (href) return <Link href={href} className="block">{inner}</Link>;
  if (onClick) return <button onClick={onClick} className="block w-full text-left">{inner}</button>;
  return inner;
}
