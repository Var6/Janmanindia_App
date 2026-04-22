export default function NoDBBanner() {
  return (
    <div className="flex items-start gap-3 rounded-xl px-4 py-3.5 text-sm"
      style={{
        background: "var(--warning-bg)",
        border: "1px solid color-mix(in srgb, var(--warning) 35%, transparent)",
        color: "var(--warning-text)",
      }}>
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0 mt-0.5">
        <path d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495z"/>
        <line x1="10" y1="8" x2="10" y2="11"/>
        <circle cx="10" cy="14" r=".5" fill="currentColor"/>
      </svg>
      <div>
        <p className="font-semibold">Database not connected — showing empty state</p>
        <p className="mt-0.5 text-xs opacity-80">
          Add <code className="rounded px-1 py-0.5 font-mono" style={{ background: "rgba(0,0,0,0.08)" }}>MONGODB_URI</code> to{" "}
          <code className="rounded px-1 py-0.5 font-mono" style={{ background: "rgba(0,0,0,0.08)" }}>.env.local</code>{" "}
          and restart the dev server. Then visit{" "}
          <a href="/dev" className="underline underline-offset-2 hover:opacity-80">/dev</a> to seed test data.
        </p>
      </div>
    </div>
  );
}
