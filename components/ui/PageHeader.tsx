/**
 * Graphic page header — a warm gradient band with a big icon chip, title, and
 * subtitle, plus an optional action slot on the right. Replaces the plain
 * h1+p header pattern so every page opens with some visual identity.
 */
export default function PageHeader({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-hero px-6 py-5 flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-4 min-w-0">
        <span className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
          style={{ background: "color-mix(in srgb, var(--accent) 12%, var(--surface))", border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)" }}>
          {icon}
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-(--text) leading-tight">{title}</h1>
          {subtitle && <p className="text-sm text-(--muted) mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children && <div className="flex items-center gap-2 flex-wrap">{children}</div>}
    </div>
  );
}
