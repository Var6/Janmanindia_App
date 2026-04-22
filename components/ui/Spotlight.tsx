/** Subtle radial glow used as a hero/banner background. */
export default function Spotlight({ color = "var(--accent)", className = "" }: { color?: string; className?: string }) {
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 -z-10 ${className}`}>
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[80%] h-[400px] rounded-full blur-3xl opacity-30"
        style={{ background: `radial-gradient(closest-side, ${color}, transparent)` }} />
    </div>
  );
}
