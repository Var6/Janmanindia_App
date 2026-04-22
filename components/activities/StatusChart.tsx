"use client";

interface Props {
  counts: {
    planned: number;
    in_progress: number;
    done: number;
    cancelled: number;
  };
}

const SEGMENTS: { key: keyof Props["counts"]; label: string; color: string }[] = [
  { key: "planned",     label: "Planned",     color: "var(--info, #3b82f6)" },
  { key: "in_progress", label: "In progress", color: "var(--warning, #f59e0b)" },
  { key: "done",        label: "Done",        color: "var(--success, #16a34a)" },
  { key: "cancelled",   label: "Cancelled",   color: "var(--muted, #9ca3af)" },
];

/** Stacked-bar chart showing distribution + per-segment count grid. */
export default function StatusChart({ counts }: Props) {
  const total = SEGMENTS.reduce((s, seg) => s + counts[seg.key], 0);
  if (total === 0) return null;

  return (
    <div className="rounded-2xl border border-(--border) bg-(--surface) p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-(--text)">Status Distribution</h3>
        <span className="text-xs text-(--muted)">{total} total</span>
      </div>

      {/* Stacked horizontal bar */}
      <div className="flex h-3 w-full rounded-full overflow-hidden bg-(--bg) border border-(--border)">
        {SEGMENTS.map((seg) => {
          const pct = (counts[seg.key] / total) * 100;
          if (pct === 0) return null;
          return (
            <div key={seg.key} title={`${seg.label}: ${counts[seg.key]} (${pct.toFixed(0)}%)`}
              style={{ width: `${pct}%`, background: seg.color }} />
          );
        })}
      </div>

      {/* Legend with vertical mini-bars */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
        {SEGMENTS.map((seg) => {
          const pct = (counts[seg.key] / total) * 100;
          return (
            <div key={seg.key}>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: seg.color }} />
                <p className="text-xs text-(--muted)">{seg.label}</p>
              </div>
              <p className="text-xl font-bold text-(--text)">{counts[seg.key]}</p>
              <div className="mt-1 h-1.5 rounded-full bg-(--bg) border border-(--border) overflow-hidden">
                <div className="h-full" style={{ width: `${pct}%`, background: seg.color }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
