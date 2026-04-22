interface Grievance {
  _id: string;
  category: string;
  subject: string;
  description: string;
  status: "open" | "in_review" | "responded" | "closed";
  hrResponse?: string;
  respondedBy?: { name: string; role: string } | null;
  respondedAt?: string;
  createdAt: string;
  anonymous?: boolean;
}

interface Props {
  grievances: Grievance[];
}

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  open:      { bg: "var(--info-bg, #dbeafe)",    color: "var(--info-text, #1e40af)",    label: "Open"        },
  in_review: { bg: "var(--warning-bg, #fef3c7)", color: "var(--warning-text, #92400e)", label: "In review"   },
  responded: { bg: "var(--success-bg, #dcfce7)", color: "var(--success-text, #15803d)", label: "Responded"   },
  closed:    { bg: "var(--bg-secondary, #f3f4f6)", color: "var(--muted)",                label: "Closed"      },
};

export default function MyGrievances({ grievances }: Props) {
  if (grievances.length === 0) {
    return (
      <div className="rounded-2xl border border-(--border) bg-(--surface) px-6 py-10 text-center">
        <p className="text-2xl mb-2">📬</p>
        <p className="text-sm text-(--muted)">No grievances submitted yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {grievances.map((g) => {
        const st = STATUS_STYLE[g.status] ?? STATUS_STYLE.open;
        return (
          <article key={g._id} className="rounded-2xl border border-(--border) bg-(--surface) p-5">
            <header className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-[10px] uppercase font-bold tracking-wide px-1.5 py-0.5 rounded"
                    style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}>
                    {g.category}
                  </span>
                  {g.anonymous && (
                    <span className="text-[10px] uppercase font-bold tracking-wide px-1.5 py-0.5 rounded border border-(--border) text-(--muted)">
                      Anonymous
                    </span>
                  )}
                </div>
                <p className="font-semibold text-sm text-(--text)">{g.subject}</p>
                <p className="text-[11px] text-(--muted) mt-0.5">
                  Submitted {new Date(g.createdAt).toLocaleDateString("en-IN")}
                </p>
              </div>
              <span className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ background: st.bg, color: st.color }}>
                {st.label}
              </span>
            </header>

            <p className="text-sm text-(--text) whitespace-pre-wrap mb-3">{g.description}</p>

            {g.hrResponse && (
              <div className="mt-3 rounded-lg border-l-4 px-3 py-2"
                style={{ borderColor: "var(--accent)", background: "var(--accent-subtle)" }}>
                <p className="text-[11px] font-bold uppercase tracking-wide text-(--accent) mb-1">
                  HR Response · {g.respondedBy?.name ?? "HR"}{g.respondedAt ? ` · ${new Date(g.respondedAt).toLocaleDateString("en-IN")}` : ""}
                </p>
                <p className="text-sm text-(--text) whitespace-pre-wrap">{g.hrResponse}</p>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
