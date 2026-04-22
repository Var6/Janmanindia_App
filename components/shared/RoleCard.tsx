"use client";

interface Props {
  icon: string;
  title: string;
  description: string;
  borderColor: string;
}

export default function RoleCard({ icon, title, description, borderColor }: Props) {
  return (
    <article
      className="rounded-2xl border p-6 transition-all duration-200 cursor-default"
      style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = borderColor;
        el.style.boxShadow = "var(--shadow)";
        el.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = "var(--border)";
        el.style.boxShadow = "var(--shadow-sm)";
        el.style.transform = "translateY(0)";
      }}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-4"
        style={{ background: "var(--bg-secondary)" }}>
        {icon}
      </div>
      <h3 className="font-bold text-(--text)">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-(--muted)">{description}</p>
    </article>
  );
}
