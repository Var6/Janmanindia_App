"use client";

import { useTheme } from "@/components/ui/ThemeProvider";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === "dark";
  return (
    <button onClick={toggleTheme}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label="Toggle theme"
      className="w-9 h-9 rounded-lg border flex items-center justify-center text-(--muted) hover:text-(--text) hover:border-(--accent) transition-colors"
      style={{ borderColor: "color-mix(in srgb, var(--border) 70%, transparent)", background: "color-mix(in srgb, var(--surface) 60%, transparent)" }}>
      {dark ? (
        // sun
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <circle cx="10" cy="10" r="3.5" />
          <path d="M10 1.5v2M10 16.5v2M3.5 10h-2M18.5 10h-2M5.05 5.05L3.6 3.6M16.4 16.4l-1.45-1.45M5.05 14.95L3.6 16.4M16.4 3.6l-1.45 1.45" />
        </svg>
      ) : (
        // moon
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <path d="M16.5 12.5A7 7 0 017.5 3.5a7 7 0 109 9z" />
        </svg>
      )}
    </button>
  );
}
