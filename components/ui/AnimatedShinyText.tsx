"use client";

interface Props { children: React.ReactNode; className?: string }

/** Aceternity-style shimmer-on-text. Pairs with a contrasting background. */
export default function AnimatedShinyText({ children, className = "" }: Props) {
  return (
    <>
      <span className={`bg-clip-text text-transparent ${className}`}
        style={{
          backgroundImage:
            "linear-gradient(110deg, var(--text) 45%, var(--accent) 50%, var(--text) 55%)",
          backgroundSize: "200% 100%",
          animation: "shiny-text 4s linear infinite",
        }}>
        {children}
      </span>
      <style jsx global>{`
        @keyframes shiny-text {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </>
  );
}
