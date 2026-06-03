"use client";

/**
 * High Court 4-stage tracker + named document slots. Sits inside
 * `LegalProgressBlock` on the case detail page for matters with
 * `path === "highcourt"`.
 *
 * Stages:  Office Notes → Admission → Arguments → Judgements
 * Slots:   Main Petition · Counter Affidavits[] · Rejoinders[] ·
 *          Notes of Arguments · List of Dates[] · Orders[]
 *
 * Stage-flip uses the existing PATCH `stageTransition` op (the API gained
 * `officeNotes`/`argumentsStage`/`judgements` keys); document upload uses
 * the existing `addDocument` op with the new `category` strings.
 */

import { useState } from "react";
import { useT } from "@/components/i18n/LanguageProvider";

type DocMeta = { _id?: string; label: string; url: string; uploadedAt: string };
type Step = { filed: boolean; filedAt?: string };
type ListEntry = { _id: string; date: string; label: string; addedBy: string; addedAt: string; doc?: DocMeta };

interface Props {
  caseId: string;
  caseData: {
    highCourtPath?: {
      officeNotes?: Step;
      admission?: Step;
      argumentsStage?: Step;
      judgements?: Step;
      mainPetitionDoc?: DocMeta;
      counterAffidavitDocs?: DocMeta[];
      rejoinderDocs?: DocMeta[];
      notesOfArgumentsDoc?: DocMeta;
      listOfDates?: ListEntry[];
      orderDocs?: DocMeta[];
    };
  };
  canEdit: boolean;
  onChanged: () => void;
}

const STAGES: { id: "officeNotes" | "admission" | "argumentsStage" | "judgements"; label: string; sub: string }[] = [
  { id: "officeNotes",    label: "Office Notes",  sub: "Drafting + filing prep" },
  { id: "admission",      label: "Admission",     sub: "Court has admitted the matter" },
  { id: "argumentsStage", label: "Arguments",     sub: "Hearings on merits" },
  { id: "judgements",     label: "Judgements",    sub: "Order / final disposal" },
];

const SLOTS: { key: keyof NonNullable<Props["caseData"]["highCourtPath"]>; label: string; category: string; multi: boolean }[] = [
  { key: "mainPetitionDoc",      label: "Main Petition",       category: "main-petition",       multi: false },
  { key: "counterAffidavitDocs", label: "Counter Affidavit",   category: "counter-affidavit",   multi: true  },
  { key: "rejoinderDocs",        label: "Rejoinder",            category: "rejoinders",          multi: true  },
  { key: "notesOfArgumentsDoc",  label: "Notes of Arguments",  category: "notes-of-arguments",  multi: false },
  { key: "orderDocs",            label: "Orders",               category: "order",               multi: true  },
];

function fmtDate(d?: string) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function HighCourtStagesAndDocs({ caseId, caseData, canEdit, onChanged }: Props) {
  const t = useT();
  const hcp = caseData.highCourtPath ?? {};
  const [busyStage, setBusyStage] = useState<string | null>(null);
  const [err, setErr] = useState("");

  async function flipStage(stage: typeof STAGES[number]["id"], advance: boolean) {
    setBusyStage(stage); setErr("");
    try {
      const r = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageTransition: { stage, action: advance ? "advance" : "revert" } }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setErr((d as { error?: string }).error ?? t("Failed to update stage."));
        return;
      }
      onChanged();
    } finally {
      setBusyStage(null);
    }
  }

  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
      <div className="px-4 py-2 border-b flex items-center justify-between"
        style={{ background: "color-mix(in srgb, var(--accent) 6%, var(--surface))", borderColor: "var(--border)" }}>
        <span className="text-xs font-semibold" style={{ color: "var(--accent)" }}>
          {t("High Court Tracker")}
        </span>
      </div>

      <div className="px-5 py-4 space-y-5">
        {err && <div className="p-2 rounded-lg text-xs" style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>{err}</div>}

        {/* 4-stage strip */}
        <div>
          <p className="text-[10px] font-semibold text-(--muted) uppercase tracking-wide mb-2">{t("Stages")}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {STAGES.map(stage => {
              const step = (hcp as Record<string, Step | undefined>)[stage.id];
              const done = Boolean(step?.filed);
              const busy = busyStage === stage.id;
              return (
                <div key={stage.id} className="rounded-xl border p-3 flex flex-col gap-1"
                  style={{
                    background: done
                      ? "color-mix(in srgb, var(--success) 8%, var(--surface))"
                      : "var(--bg)",
                    borderColor: done
                      ? "color-mix(in srgb, var(--success) 35%, transparent)"
                      : "var(--border)",
                  }}>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full"
                      style={{ background: done ? "var(--success)" : "var(--muted)" }} />
                    <p className="text-xs font-semibold text-(--text)">{t(stage.label)}</p>
                  </div>
                  <p className="text-[10px] text-(--muted) leading-snug">{t(stage.sub)}</p>
                  {done && step?.filedAt && (
                    <p className="text-[10px] text-(--success-text)">{t("Reached")} {fmtDate(step.filedAt)}</p>
                  )}
                  {canEdit && (
                    <button type="button" disabled={busy} onClick={() => flipStage(stage.id, !done)}
                      className="text-[10px] font-medium mt-auto self-start hover:underline"
                      style={{ color: done ? "var(--muted)" : "var(--accent)" }}>
                      {busy ? "…" : done ? t("Mark not reached") : t("Mark reached")}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Document slots */}
        <div>
          <p className="text-[10px] font-semibold text-(--muted) uppercase tracking-wide mb-2">{t("Documents")}</p>
          <div className="space-y-2">
            {SLOTS.map(slot => {
              const value = (hcp as Record<string, unknown>)[slot.key];
              const docs: DocMeta[] = slot.multi
                ? ((value as DocMeta[] | undefined) ?? [])
                : value
                  ? [value as DocMeta]
                  : [];
              return (
                <SlotRow key={slot.key as string} caseId={caseId} canEdit={canEdit}
                  label={slot.label} category={slot.category} multi={slot.multi}
                  docs={docs} onChanged={onChanged} />
              );
            })}
          </div>
        </div>

        {/* List of dates */}
        <ListOfDatesSection caseId={caseId} entries={hcp.listOfDates ?? []} canEdit={canEdit} onChanged={onChanged} />
      </div>
    </div>
  );
}

function SlotRow({ caseId, label, category, multi, docs, canEdit, onChanged }: {
  caseId: string;
  label: string;
  category: string;
  multi: boolean;
  docs: DocMeta[];
  canEdit: boolean;
  onChanged: () => void;
}) {
  const t = useT();
  const [adding, setAdding] = useState(false);
  const [url, setUrl] = useState("");
  const [docLabel, setDocLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function add() {
    if (!url.trim()) { setErr(t("Paste the file URL first.")); return; }
    setBusy(true); setErr("");
    try {
      const r = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addDocument: {
            label: docLabel.trim() || label,
            url: url.trim(),
            category,
          },
        }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setErr((d as { error?: string }).error ?? t("Failed to attach."));
        return;
      }
      setUrl(""); setDocLabel(""); setAdding(false);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border px-3 py-2.5"
      style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-(--text)">
            {t(label)}
            {docs.length > 0 && (
              <span className="ml-2 text-[10px] font-normal text-(--muted)">{docs.length} {t("on file")}</span>
            )}
          </p>
          {docs.length === 0 && (
            <p className="text-[11px] text-(--muted) italic">{t("Not yet attached.")}</p>
          )}
        </div>
        {canEdit && (multi || docs.length === 0) && !adding && (
          <button type="button" onClick={() => setAdding(true)}
            className="text-xs hover:underline shrink-0" style={{ color: "var(--accent)" }}>
            {t("+ Attach")}
          </button>
        )}
      </div>

      {docs.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {docs.map((d, i) => (
            <a key={d._id ?? i} href={d.url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border hover:border-(--accent) transition-colors"
              style={{ borderColor: "var(--border)", color: "var(--accent)" }}>
              📎 {d.label}
              <span className="text-(--muted)">· {fmtDate(d.uploadedAt)}</span>
            </a>
          ))}
        </div>
      )}

      {adding && (
        <div className="mt-3 space-y-2 rounded-lg p-3" style={{ background: "var(--surface)" }}>
          {err && <div className="p-2 rounded-lg text-xs" style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>{err}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input value={url} onChange={e => setUrl(e.target.value)}
              placeholder={t("File URL (uploaded to S3 / drive)")}
              className="sm:col-span-2 px-3 py-2 rounded-lg border text-xs focus:outline-none"
              style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
            <input value={docLabel} onChange={e => setDocLabel(e.target.value)}
              placeholder={t("Label (optional)")}
              className="px-3 py-2 rounded-lg border text-xs focus:outline-none"
              style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
          </div>
          <div className="flex items-center gap-2 text-xs">
            <button type="button" disabled={busy || !url.trim()} onClick={add}
              className="px-3 py-1.5 rounded-lg font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
              {busy ? t("Attaching…") : t("Attach")}
            </button>
            <button type="button" onClick={() => { setAdding(false); setUrl(""); setDocLabel(""); setErr(""); }}
              className="text-(--muted) hover:text-(--text)">{t("Cancel")}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ListOfDatesSection({ caseId, entries, canEdit, onChanged }: {
  caseId: string;
  entries: ListEntry[];
  canEdit: boolean;
  onChanged: () => void;
}) {
  const t = useT();
  const [adding, setAdding]   = useState(false);
  const [date, setDate]       = useState(() => new Date().toISOString().slice(0, 10));
  const [label, setLabel]     = useState("");
  const [docUrl, setDocUrl]   = useState("");
  const [busy, setBusy]       = useState(false);
  const [err, setErr]         = useState("");
  const sorted = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  async function add() {
    if (!label.trim() || !date) { setErr(t("Date + label are required.")); return; }
    setBusy(true); setErr("");
    try {
      const r = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addListOfDatesEntry: {
            date, label: label.trim(),
            ...(docUrl.trim() ? { docUrl: docUrl.trim(), docLabel: label.trim() } : {}),
          },
        }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setErr((d as { error?: string }).error ?? t("Failed to add entry."));
        return;
      }
      setLabel(""); setDocUrl(""); setAdding(false);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-[10px] font-semibold text-(--muted) uppercase tracking-wide">{t("List of Dates")} · {sorted.length}</p>
        {canEdit && !adding && (
          <button type="button" onClick={() => setAdding(true)}
            className="text-xs hover:underline" style={{ color: "var(--accent)" }}>{t("+ Add entry")}</button>
        )}
      </div>

      {sorted.length === 0 && !adding && (
        <p className="text-xs text-(--muted) italic">{t("No dates logged yet.")}</p>
      )}

      {sorted.length > 0 && (
        <ol className="space-y-1.5 border-l pl-4 ml-1" style={{ borderColor: "var(--border)" }}>
          {sorted.map(e => (
            <li key={e._id} className="text-xs">
              <p className="text-(--text)">
                <span className="font-mono font-semibold mr-2" style={{ color: "var(--accent)" }}>{fmtDate(e.date)}</span>
                {e.label}
              </p>
              {e.doc && (
                <a href={e.doc.url} target="_blank" rel="noopener noreferrer"
                  className="text-[11px] hover:underline" style={{ color: "var(--accent)" }}>
                  📎 {e.doc.label}
                </a>
              )}
            </li>
          ))}
        </ol>
      )}

      {adding && (
        <div className="mt-3 rounded-lg p-3 space-y-2" style={{ background: "var(--bg)" }}>
          {err && <div className="p-2 rounded-lg text-xs" style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>{err}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="px-3 py-2 rounded-lg border text-xs focus:outline-none"
              style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }} />
            <input value={label} onChange={e => setLabel(e.target.value)}
              placeholder={t("What happened on this date")}
              className="sm:col-span-2 px-3 py-2 rounded-lg border text-xs focus:outline-none"
              style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }} />
            <input value={docUrl} onChange={e => setDocUrl(e.target.value)}
              placeholder={t("Supporting doc URL (optional)")}
              className="sm:col-span-3 px-3 py-2 rounded-lg border text-xs focus:outline-none"
              style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }} />
          </div>
          <div className="flex items-center gap-2 text-xs">
            <button type="button" disabled={busy || !label.trim() || !date} onClick={add}
              className="px-3 py-1.5 rounded-lg font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
              {busy ? t("Adding…") : t("Add")}
            </button>
            <button type="button" onClick={() => { setAdding(false); setLabel(""); setDocUrl(""); setErr(""); }}
              className="text-(--muted) hover:text-(--text)">{t("Cancel")}</button>
          </div>
        </div>
      )}
    </div>
  );
}
