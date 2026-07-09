import Link from "next/link";

/**
 * A consistent, graphic KPI card for dashboards — an icon chip, a big number,
 * and a short label. Optionally a link. Keeps every dashboard's headline stats
 * looking the same (less bespoke text, more scannable graphics).
 */
export default function StatCard({
  label,
  value,
  icon,
  accent = "var(--accent)",
  bg = "var(--accent-subtle)",
  href,
  highlight = false,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  accent?: string;
  bg?: string;
  href?: string;
  highlight?: boolean;
}) {
  const inner = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-(--muted)">{label}</p>
        {icon != null && (
          <span className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: bg }}>
            {icon}
          </span>
        )}
      </div>
      <p className="text-3xl font-bold tabular-nums" style={{ color: highlight ? accent : "var(--text)" }}>{value}</p>
    </>
  );
  const cls = "rounded-2xl border border-(--border) p-5 flex flex-col gap-3 card-lift";
  const style = { background: "var(--surface)", boxShadow: "var(--shadow-sm)" } as React.CSSProperties;
  return href ? (
    <Link href={href} className={`${cls} transition-colors hover:border-(--accent)`} style={style}>{inner}</Link>
  ) : (
    <div className={cls} style={style}>{inner}</div>
  );
}
