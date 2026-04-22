import { NATIONAL_EMERGENCY, BIHAR_HELPLINES, type Helpline } from "@/lib/helplines";

interface Props {
  /** Show the urgent banner header (use when distress is detected). */
  urgent?: boolean;
  /** Hide Bihar-specific scheme helplines (e.g. on the SOS screen). */
  nationalOnly?: boolean;
}

export default function CrisisPanel({ urgent = false, nationalOnly = false }: Props) {
  const lists: { title: string; titleHi: string; items: Helpline[] }[] = [
    { title: "Emergency", titleHi: "आपातकाल", items: NATIONAL_EMERGENCY },
  ];
  if (!nationalOnly) lists.push({ title: "Bihar Helplines", titleHi: "बिहार हेल्पलाइन", items: BIHAR_HELPLINES });

  return (
    <section
      className="rounded-2xl border overflow-hidden"
      style={{
        background: urgent ? "var(--error-bg, #fee2e2)" : "var(--surface)",
        borderColor: urgent ? "color-mix(in srgb, var(--error, #dc2626) 40%, transparent)" : "var(--border)",
      }}
      role={urgent ? "alert" : undefined}
    >
      {urgent && (
        <div
          className="px-5 py-3 flex items-start gap-3 border-b"
          style={{ borderColor: "color-mix(in srgb, var(--error, #dc2626) 25%, transparent)" }}
        >
          <span className="text-xl shrink-0">⚠</span>
          <div>
            <p className="font-bold text-sm" style={{ color: "var(--error-text, #b91c1c)" }}>
              You are not alone — help is one call away.
            </p>
            <p className="text-xs mt-0.5 lang-hi" style={{ color: "var(--error-text, #b91c1c)" }}>
              आप अकेले नहीं हैं — मदद एक कॉल दूर है।
            </p>
          </div>
        </div>
      )}

      <div className="p-5 space-y-5">
        {lists.map((list) => (
          <div key={list.title}>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-(--muted) mb-2">
              {list.title} <span className="lang-hi">· {list.titleHi}</span>
            </h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {list.items.map((h) => (
                <li key={h.number}>
                  <a
                    href={`tel:${h.number.replace(/[^\d+]/g, "")}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-(--border) px-3 py-2.5 hover:border-(--accent) transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-(--text) truncate">{h.name}</p>
                      <p className="text-xs text-(--muted) truncate lang-hi">{h.hi}{h.hours ? ` · ${h.hours}` : ""}</p>
                    </div>
                    <span className="text-sm font-mono font-semibold shrink-0" style={{ color: "var(--accent)" }}>
                      {h.number}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
