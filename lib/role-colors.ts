/**
 * Role → colour palette for attribution badges (review meetings, discussion
 * timelines). Each role gets a visually distinct hue so you can tell at a glance
 * who said/decided what — directors, the case creator, litigation, social
 * workers etc. all read differently. Colours use CSS color-mix on theme tokens
 * so they adapt to light/dark.
 */

export interface RoleColor {
  /** Soft background for the badge / timeline node. */
  bg: string;
  /** Readable text/accent colour. */
  text: string;
  /** Solid dot / border colour. */
  dot: string;
  /** Friendly label. */
  label: string;
}

const PALETTE: Record<string, { base: string; label: string }> = {
  director:      { base: "#7c3aed", label: "Director" },       // violet
  superadmin:    { base: "#6d28d9", label: "Super Admin" },    // deep violet
  litigation:    { base: "#2563eb", label: "Litigation" },     // blue
  socialworker:  { base: "#059669", label: "Social Worker" },  // green
  administrator: { base: "#0d9488", label: "Administrator" },  // teal
  hr:            { base: "#db2777", label: "HR" },             // pink
  finance:       { base: "#ea580c", label: "Finance" },        // orange
  community:     { base: "#d97706", label: "Community" },      // amber
  pending:       { base: "#6b7280", label: "Pending" },        // grey
};

const FALLBACK = { base: "#6b7280", label: "Member" };

export function roleColor(role?: string): RoleColor {
  const p = (role && PALETTE[role]) || FALLBACK;
  return {
    bg: `color-mix(in srgb, ${p.base} 14%, transparent)`,
    text: p.base,
    dot: p.base,
    label: p.label,
  };
}

/** Distinct colour for the case CREATOR, regardless of their role, so the
 *  person who opened the case stands out in the timeline. */
export const CREATOR_COLOR: RoleColor = {
  bg: "color-mix(in srgb, #0891b2 16%, transparent)", // cyan
  text: "#0891b2",
  dot: "#0891b2",
  label: "Case creator",
};
