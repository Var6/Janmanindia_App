import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSessionFromCookies } from "@/lib/auth";
import { tryConnectDB } from "@/lib/mongoose";
import Case from "@/models/Case";
import type { ICase, IDocument } from "@/models/Case";

const OCR_BADGE: Record<string, string> = {
  pending: "bg-gray-100 text-gray-600",
  processing: "bg-yellow-100 text-yellow-700",
  processed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-600",
};

function DocRow({ doc }: { doc: IDocument }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-[var(--border)] last:border-0">
      <div className="min-w-0">
        <a
          href={doc.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-[var(--accent)] hover:underline truncate block"
        >
          {doc.label}
        </a>
        {doc.ocrText && (
          <p className="text-xs text-[var(--muted)] mt-1 line-clamp-2">{doc.ocrText}</p>
        )}
      </div>
      <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${OCR_BADGE[doc.ocrStatus]}`}>
        OCR: {doc.ocrStatus}
      </span>
    </div>
  );
}

function StepRow({
  label,
  filed,
  filedAt,
  notes,
  doc,
}: {
  label: string;
  filed: boolean;
  filedAt?: Date;
  notes?: string;
  doc?: IDocument;
}) {
  return (
    <div className="border border-[var(--border)] rounded-xl p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm text-[var(--text)]">{label}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${filed ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
          {filed ? `Filed${filedAt ? ` on ${new Date(filedAt).toLocaleDateString("en-IN")}` : ""}` : "Pending"}
        </span>
      </div>
      {notes && <p className="text-xs text-[var(--muted)]">{notes}</p>}
      {doc && (
        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--accent)] hover:underline block">
          View document: {doc.label}
        </a>
      )}
    </div>
  );
}

export default async function CaseWorkspacePage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "litigation") redirect("/login");

  const { caseId } = await params;

  const dbOk = await tryConnectDB();
  if (!dbOk) redirect("/litigation");

  const caseDoc = await Case.findById(caseId)
    .populate("citizen", "name email phone")
    .populate("litigationMember", "name email")
    .populate("socialWorker", "name email")
    .lean();

  if (!caseDoc) notFound();

  // Only the assigned litigation member (or superadmin) can view
  if (String(caseDoc.litigationMember?._id ?? caseDoc.litigationMember) !== session.id) {
    redirect("/litigation");
  }

  const c = caseDoc as unknown as ICase & {
    citizen: { name: string; email: string; phone?: string };
    litigationMember: { name: string; email: string };
    socialWorker?: { name: string; email: string };
  };

  const firDate =
    c.criminalPath?.firFiled && c.criminalPath.firDoc?.uploadedAt
      ? new Date(c.criminalPath.firDoc.uploadedAt)
      : null;

  const today = new Date();
  const daysSinceFir = firDate
    ? Math.floor((today.getTime() - firDate.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="space-y-6 pb-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
        <Link href="/litigation" className="hover:text-[var(--accent)]">Dashboard</Link>
        <span>/</span>
        <Link href="/litigation/cases" className="hover:text-[var(--accent)]">Cases</Link>
        <span>/</span>
        <span className="text-[var(--text)]">{c.caseNumber}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">{c.caseTitle}</h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            #{c.caseNumber} &middot;{" "}
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
              c.status === "Open" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
            }`}>{c.status}</span>
            &middot; {c.path === "criminal" ? "Criminal" : "High Court"}
          </p>
        </div>
        {c.nextHearingDate && (
          <div className="text-right shrink-0">
            <p className="text-xs text-[var(--muted)]">Next Hearing</p>
            <p className="text-sm font-bold text-[var(--accent)]">
              {new Date(c.nextHearingDate).toLocaleDateString("en-IN")}
            </p>
          </div>
        )}
      </div>

      {/* Parties */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Citizen", person: c.citizen },
          { label: "Litigation Member", person: c.litigationMember as unknown as { name: string; email: string } },
          { label: "Social Worker", person: c.socialWorker ?? null },
        ].map(({ label, person }) => (
          <div key={label} className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4">
            <p className="text-xs text-[var(--muted)] mb-1">{label}</p>
            {person ? (
              <>
                <p className="text-sm font-medium text-[var(--text)]">{person.name}</p>
                <p className="text-xs text-[var(--muted)]">{person.email}</p>
              </>
            ) : (
              <p className="text-xs text-[var(--muted)]">Not assigned</p>
            )}
          </div>
        ))}
      </div>

      {/* Path tabs */}
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border)]">
          <h2 className="font-semibold text-[var(--text)]">
            {c.path === "criminal" ? "Criminal Case Progress" : "High Court Petition Progress"}
          </h2>
        </div>

        <div className="p-6">
          {c.path === "criminal" && c.criminalPath ? (
            <div className="space-y-4">
              {/* FIR Alert banner */}
              {daysSinceFir !== null && daysSinceFir > 60 && (
                <div className={`p-4 rounded-xl border ${daysSinceFir > 90 ? "bg-red-50 border-red-300 text-red-700" : "bg-orange-50 border-orange-300 text-orange-700"}`}>
                  <p className="text-sm font-semibold">
                    {daysSinceFir > 90
                      ? `ALERT: ${daysSinceFir} days since FIR — chargesheet severely overdue!`
                      : `Warning: ${daysSinceFir} days since FIR — chargesheet due within ${90 - daysSinceFir} days`}
                  </p>
                </div>
              )}

              {/* FIR */}
              <StepRow
                label="FIR Filed"
                filed={c.criminalPath.firFiled}
                filedAt={c.criminalPath.firDoc?.uploadedAt}
                doc={c.criminalPath.firDoc}
              />

              {/* Chargesheet */}
              <div className="border border-[var(--border)] rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-[var(--text)]">Chargesheet</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${c.criminalPath.chargesheetFiled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {c.criminalPath.chargesheetFiled ? "Filed" : "Pending"}
                  </span>
                </div>
                {c.criminalPath.chargesheetDueDate && (
                  <p className="text-xs text-[var(--muted)]">
                    Due: {new Date(c.criminalPath.chargesheetDueDate).toLocaleDateString("en-IN")}
                    {c.criminalPath.chargesheetAlertSent && (
                      <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">Alert sent</span>
                    )}
                  </p>
                )}
              </div>

              {/* Cognizance */}
              <StepRow
                label="Cognizance Order"
                filed={!!c.criminalPath.cognizanceOrderDoc}
                filedAt={c.criminalPath.cognizanceOrderDoc?.uploadedAt}
                doc={c.criminalPath.cognizanceOrderDoc}
              />

              {/* Charges Framed */}
              <div className="border border-[var(--border)] rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-[var(--text)]">Charges Framed</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${c.criminalPath.chargesFramed ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {c.criminalPath.chargesFramed ? "Yes" : "No"}
                  </span>
                </div>
                {c.criminalPath.chargeDocs?.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {c.criminalPath.chargeDocs.map((d, i) => (
                      <a key={i} href={d.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--accent)] hover:underline block">
                        {d.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {/* Trial */}
              <div className="border border-[var(--border)] rounded-xl p-4 space-y-3">
                <p className="font-medium text-sm text-[var(--text)]">Trial</p>
                <div className="grid grid-cols-2 gap-4 text-xs text-[var(--muted)]">
                  <div>
                    <p className="font-medium text-[var(--text)] mb-1">Prosecution Witnesses ({c.criminalPath.trial.prosecutionWitnesses?.length ?? 0})</p>
                    {c.criminalPath.trial.prosecutionWitnesses?.map((w, i) => (
                      <p key={i}>{w.name}{w.deposedAt ? ` — ${new Date(w.deposedAt).toLocaleDateString("en-IN")}` : ""}</p>
                    ))}
                  </div>
                  <div>
                    <p className="font-medium text-[var(--text)] mb-1">Defence Witnesses ({c.criminalPath.trial.defenseWitnesses?.length ?? 0})</p>
                    {c.criminalPath.trial.defenseWitnesses?.map((w, i) => (
                      <p key={i}>{w.name}{w.deposedAt ? ` — ${new Date(w.deposedAt).toLocaleDateString("en-IN")}` : ""}</p>
                    ))}
                  </div>
                </div>
              </div>

              {/* Verdict */}
              {c.criminalPath.verdict && (
                <div className="border border-green-200 rounded-xl p-4 bg-green-50">
                  <p className="text-xs text-[var(--muted)] mb-1">Verdict</p>
                  <p className="text-sm font-semibold text-green-800">{c.criminalPath.verdict}</p>
                  {c.criminalPath.verdictDate && (
                    <p className="text-xs text-green-600 mt-0.5">
                      {new Date(c.criminalPath.verdictDate).toLocaleDateString("en-IN")}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : c.path === "highcourt" && c.highCourtPath ? (
            <div className="space-y-4">
              {(
                [
                  ["Petition Filed", c.highCourtPath.petitionFiled],
                  ["Supporting Affidavit", c.highCourtPath.supportingAffidavit],
                  ["Admission", c.highCourtPath.admission],
                  ["Counter Affidavit", c.highCourtPath.counterAffidavit],
                  ["Rejoinder", c.highCourtPath.rejoinder],
                  ["Plea Close", c.highCourtPath.pleaClose],
                  ["Inducement", c.highCourtPath.inducement],
                ] as [string, (typeof c.highCourtPath.petitionFiled)][]
              ).map(([label, step]) => (
                <StepRow
                  key={label}
                  label={label}
                  filed={step?.filed ?? false}
                  filedAt={step?.filedAt}
                  notes={step?.notes}
                  doc={step?.doc}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--muted)]">No path data available.</p>
          )}
        </div>
      </div>

      {/* Case Diary */}
      <section className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="font-semibold text-[var(--text)]">Case Diary</h2>
          <span className="text-xs text-[var(--muted)]">{c.caseDiary?.length ?? 0} entries</span>
        </div>
        {!c.caseDiary?.length ? (
          <p className="px-6 py-6 text-sm text-[var(--muted)] text-center">No diary entries yet.</p>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {[...c.caseDiary].reverse().map((entry, i) => (
              <div key={i} className="px-6 py-4">
                <p className="text-xs text-[var(--muted)] mb-1">
                  {new Date(entry.date).toLocaleDateString("en-IN")}
                </p>
                <p className="text-sm text-[var(--text)] whitespace-pre-line">{entry.findings}</p>
              </div>
            ))}
          </div>
        )}
        {/* Diary entry form (client component pattern via native form) */}
        <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--bg)]">
          <AddDiaryEntryForm caseId={caseId} />
        </div>
      </section>

      {/* Uploaded Documents */}
      <section className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="font-semibold text-[var(--text)]">Documents</h2>
          <span className="text-xs text-[var(--muted)]">{c.documents?.length ?? 0} files</span>
        </div>
        <div className="px-6 py-2">
          {!c.documents?.length ? (
            <p className="py-4 text-sm text-[var(--muted)]">No documents uploaded.</p>
          ) : (
            c.documents.map((doc, i) => <DocRow key={i} doc={doc} />)
          )}
        </div>
      </section>

      {/* Next Hearing Date update */}
      <section className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6">
        <h2 className="font-semibold text-[var(--text)] mb-4">Update Next Hearing Date</h2>
        <UpdateHearingForm caseId={caseId} currentDate={c.nextHearingDate?.toISOString().split("T")[0] ?? ""} />
      </section>
    </div>
  );
}

function AddDiaryEntryForm({ caseId }: { caseId: string }) {
  return (
    <form action={`/api/cases/${caseId}/diary`} method="POST" className="space-y-3">
      <textarea
        name="findings"
        placeholder="Write diary entry findings…"
        rows={3}
        className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] resize-none focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
        required
      />
      <div className="flex items-center gap-3">
        <input
          type="date"
          name="date"
          defaultValue={new Date().toISOString().split("T")[0]}
          className="px-3 py-1.5 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          required
        />
        <button
          type="submit"
          className="px-4 py-1.5 rounded-lg bg-[var(--accent)] text-[var(--accent-contrast)] text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Add Entry
        </button>
      </div>
    </form>
  );
}

function UpdateHearingForm({ caseId, currentDate }: { caseId: string; currentDate: string }) {
  return (
    <form action={`/api/cases/${caseId}`} method="PATCH" className="flex items-center gap-4">
      <input type="hidden" name="_method" value="PATCH" />
      <input
        type="date"
        name="nextHearingDate"
        defaultValue={currentDate}
        className="px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
      />
      <button
        type="submit"
        className="px-4 py-2 rounded-lg bg-[var(--accent)] text-[var(--accent-contrast)] text-sm font-medium hover:opacity-90 transition-opacity"
      >
        Save &amp; Sync Calendar
      </button>
    </form>
  );
}
