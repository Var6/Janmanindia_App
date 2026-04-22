"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { type TrainingMaterial, FILE_TYPE_LABELS } from "./types";

interface Props {
  materials: TrainingMaterial[];
}

export default function ApprovalQueue({ materials }: Props) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function review(id: string, action: "approve" | "reject") {
    let reason: string | undefined;
    if (action === "reject") {
      reason = prompt("Reason for rejection (visible to uploader):") ?? undefined;
      if (reason === undefined) return;
    }
    setBusyId(id);
    try {
      const res = await fetch(`/api/training/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "Review failed");
      } else {
        router.refresh();
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="rounded-2xl border overflow-hidden"
      style={{ background: "var(--warning-bg, #fef3c7)", borderColor: "color-mix(in srgb, var(--warning, #f59e0b) 30%, transparent)" }}>
      <div className="px-5 py-3 border-b flex items-center gap-2"
        style={{ borderColor: "color-mix(in srgb, var(--warning, #f59e0b) 25%, transparent)" }}>
        <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--warning, #f59e0b)" }} />
        <h2 className="font-semibold text-sm" style={{ color: "var(--warning-text, #92400e)" }}>
          Pending Approval ({materials.length})
        </h2>
      </div>
      {materials.length === 0 ? (
        <p className="px-5 py-6 text-sm text-center text-(--muted)">All caught up — no materials awaiting review.</p>
      ) : (
        <ul className="divide-y" style={{ borderColor: "color-mix(in srgb, var(--warning, #f59e0b) 15%, transparent)" }}>
          {materials.map((m) => (
            <li key={m._id} className="px-5 py-4 flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <p className="font-medium text-sm text-(--text)">{m.title}</p>
                  <span className="text-[10px] uppercase font-bold tracking-wide px-1.5 py-0.5 rounded"
                    style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}>
                    {FILE_TYPE_LABELS[m.fileType]}
                  </span>
                </div>
                {m.description && <p className="text-xs text-(--muted) mb-1">{m.description}</p>}
                <p className="text-[11px] text-(--muted)">
                  By {m.uploadedBy?.name ?? "Unknown"} · <span className="capitalize">{m.uploadedBy?.role ?? "—"}</span>
                  {m.category ? ` · ${m.category}` : ""}
                </p>
                <a href={m.fileUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-block mt-1 text-xs underline" style={{ color: "var(--accent)" }}>
                  Open file ↗
                </a>
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                <button onClick={() => review(m._id, "approve")} disabled={busyId === m._id}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg text-white disabled:opacity-50"
                  style={{ background: "var(--success, #16a34a)" }}>
                  {busyId === m._id ? "…" : "Approve"}
                </button>
                <button onClick={() => review(m._id, "reject")} disabled={busyId === m._id}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg disabled:opacity-50"
                  style={{ background: "var(--error-bg)", color: "var(--error-text)", border: "1px solid color-mix(in srgb, var(--error, #dc2626) 30%, transparent)" }}>
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
