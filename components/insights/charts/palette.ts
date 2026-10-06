/** Series colours, taken from the app's theme so they follow light / dark mode. */
export const SERIES_COLOURS = [
  "var(--accent)",
  "var(--accent-2)",
  "var(--accent-3)",
  "var(--warning)",
  "var(--info)",
  "var(--success)",
  "var(--error)",
  "var(--muted)",
];

export const RAG_STYLE: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  on_track:  { bg: "var(--success-bg)", text: "var(--success-text)", dot: "var(--success)", label: "On track" },
  attention: { bg: "var(--warning-bg)", text: "var(--warning-text)", dot: "var(--warning)", label: "Needs attention" },
  off_track: { bg: "var(--error-bg)",   text: "var(--error-text)",   dot: "var(--error)",   label: "Off track" },
  no_data:   { bg: "var(--bg-secondary)", text: "var(--muted)",      dot: "var(--muted)",   label: "No data" },
};
