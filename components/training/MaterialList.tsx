"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { type TrainingMaterial, FILE_TYPE_LABELS, FILE_TYPE_ICONS } from "./types";

interface Props {
  materials: TrainingMaterial[];
  currentUserId: string;
  currentRole: string;
}

export default function MaterialList({ materials, currentUserId, currentRole }: Props) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const isAdmin = currentRole === "director" || currentRole === "superadmin";

  async function onDelete(id: string) {
    if (!confirm("Delete this material? This cannot be undone.")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/training/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "Delete failed");
      } else {
        router.refresh();
      }
    } finally {
      setBusyId(null);
    }
  }

  if (materials.length === 0) {
    return (
      <div className="rounded-2xl border border-(--border) bg-(--surface) px-6 py-10 text-center">
        <p className="text-2xl mb-2">📚</p>
        <p className="text-sm text-(--muted)">No approved community materials yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {materials.map((m) => {
        const canDelete = isAdmin || m.uploadedBy?._id === currentUserId;
        return (
          <article key={m._id} className="rounded-2xl border border-(--border) bg-(--surface) overflow-hidden flex flex-col">
            <a href={m.fileUrl} target="_blank" rel="noopener noreferrer"
              className="block aspect-video bg-(--bg) flex items-center justify-center text-5xl hover:bg-(--accent-subtle) transition-colors">
              {FILE_TYPE_ICONS[m.fileType]}
            </a>
            <div className="p-4 flex-1 flex flex-col">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="font-semibold text-sm text-(--text) leading-snug">{m.title}</p>
                <span className="shrink-0 text-[10px] uppercase font-bold tracking-wide px-1.5 py-0.5 rounded"
                  style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}>
                  {FILE_TYPE_LABELS[m.fileType]}
                </span>
              </div>
              {m.description && <p className="text-xs text-(--muted) line-clamp-2 mb-2">{m.description}</p>}
              <p className="text-[11px] text-(--muted) mt-auto">
                {m.uploadedBy?.name ?? "Unknown"} · <span className="capitalize">{m.uploadedBy?.role ?? "—"}</span>
                {m.category ? ` · ${m.category}` : ""}
              </p>
              <div className="mt-3 flex gap-2">
                <a href={m.fileUrl} target="_blank" rel="noopener noreferrer"
                  className="flex-1 text-center text-xs font-semibold px-3 py-1.5 rounded-lg border border-(--border) hover:border-(--accent) text-(--text)">
                  Open
                </a>
                {canDelete && (
                  <button onClick={() => onDelete(m._id)} disabled={busyId === m._id}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50"
                    style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>
                    {busyId === m._id ? "…" : "Delete"}
                  </button>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
