import type { CSSProperties, HTMLAttributes } from "react";

type DivProps = HTMLAttributes<HTMLDivElement>;

interface SkeletonProps extends DivProps {
  /** Width — number = px, string = passed through (e.g. "60%"). Default 100%. */
  w?: number | string;
  /** Height — number = px, string = passed through. Default 12 (one line of text). */
  h?: number | string;
  /** Border radius shorthand. "full" = pill, "card" = 12px. Otherwise pass any CSS value. */
  rounded?: "full" | "card" | number | string;
}

function size(v: number | string | undefined, fallback: string): string {
  if (v == null) return fallback;
  return typeof v === "number" ? `${v}px` : v;
}

function radius(v: SkeletonProps["rounded"]): string | undefined {
  if (v == null) return undefined;
  if (v === "full") return "9999px";
  if (v === "card") return "12px";
  return typeof v === "number" ? `${v}px` : v;
}

/** Single shimmer block — the workhorse of every skeleton layout. */
export function Skeleton({ w, h, rounded, className, style, ...rest }: SkeletonProps) {
  const merged: CSSProperties = {
    width: size(w, "100%"),
    height: size(h, "12px"),
    borderRadius: radius(rounded),
    ...style,
  };
  return <div className={`skeleton ${className ?? ""}`.trim()} style={merged} {...rest} />;
}

/** Stack of N text-line skeletons with descending widths to mimic real prose. */
export function SkeletonLines({ count = 3, className }: { count?: number; className?: string }) {
  const widths = ["100%", "92%", "78%", "85%", "70%", "60%"];
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} w={widths[i % widths.length]} h={10} />
      ))}
    </div>
  );
}

/** A row mimicking a list item: avatar + 2-line text + trailing meta. */
export function SkeletonRow({
  withAvatar = true,
  trailing = true,
  className,
}: { withAvatar?: boolean; trailing?: boolean; className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className ?? ""}`}>
      {withAvatar && <Skeleton w={36} h={36} rounded="full" />}
      <div className="flex-1 space-y-1.5 min-w-0">
        <Skeleton w="55%" h={11} />
        <Skeleton w="35%" h={9} />
      </div>
      {trailing && <Skeleton w={56} h={20} rounded="full" />}
    </div>
  );
}

/** A card-shaped skeleton matching the surrounding rounded-2xl + border style. */
export function SkeletonCard({
  lines = 3,
  className,
  height,
}: { lines?: number; className?: string; height?: number | string }) {
  return (
    <div
      className={`rounded-2xl border p-5 ${className ?? ""}`}
      style={{ background: "var(--surface)", borderColor: "var(--border)", minHeight: height }}
    >
      <div className="space-y-2.5">
        <Skeleton w="40%" h={14} />
        <Skeleton w="100%" h={9} />
        <SkeletonLines count={lines} />
      </div>
    </div>
  );
}

/** A horizontal grid of stat cards — mirrors the dashboard summary tiles. */
export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: `repeat(${Math.min(count, 5)}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border p-4"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <Skeleton w={28} h={24} />
          <Skeleton w="70%" h={9} className="mt-2" />
        </div>
      ))}
    </div>
  );
}

/** A table-shaped skeleton with header row + N body rows — used for list pages. */
export function SkeletonTable({
  rows = 6,
  columns = 4,
  className,
}: { rows?: number; columns?: number; className?: string }) {
  return (
    <div
      className={`rounded-2xl border overflow-hidden ${className ?? ""}`}
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div className="px-5 py-3 border-b grid gap-4"
        style={{
          borderColor: "var(--border)",
          background: "var(--bg-secondary)",
          gridTemplateColumns: `1fr ${"auto ".repeat(columns - 1).trim()}`,
        }}>
        <Skeleton w={80} h={9} />
        {Array.from({ length: columns - 1 }).map((_, i) => (
          <Skeleton key={i} w={60} h={9} />
        ))}
      </div>
      <div className="divide-y" style={{ borderColor: "var(--border)" }}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-5 py-3">
            <SkeletonRow trailing={columns > 2} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** A heading + description block — used at the top of nearly every page. */
export function SkeletonPageHeader() {
  return (
    <div className="space-y-2">
      <Skeleton w={220} h={22} />
      <Skeleton w={360} h={11} />
    </div>
  );
}

/** A whole-page fallback that approximates the "header + stats + list" shape
 *  every dashboard page in this app shares. */
export function SkeletonPage({
  stats = 4,
  rows = 5,
}: { stats?: number; rows?: number }) {
  return (
    <div className="space-y-6">
      <SkeletonPageHeader />
      <SkeletonStats count={stats} />
      <SkeletonTable rows={rows} columns={4} />
    </div>
  );
}
