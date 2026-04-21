import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionFromCookies } from "@/lib/auth";
import { connectDB } from "@/lib/mongoose";
import Case from "@/models/Case";
import Appointment from "@/models/Appointment";
import SosAlert from "@/models/SosAlert";

const RTPS_GUIDES = [
  {
    title: "Right to Information (RTI)",
    description: "File an RTI application to any public authority within 30 days.",
    link: "https://rtionline.gov.in",
  },
  {
    title: "MGNREGA",
    description: "Register for 100 days of guaranteed rural employment.",
    link: "https://nrega.nic.in",
  },
  {
    title: "PM Awas Yojana",
    description: "Apply for affordable housing under the PMAY scheme.",
    link: "https://pmaymis.gov.in",
  },
  {
    title: "Ayushman Bharat",
    description: "Get health coverage up to ₹5 lakh for secondary/tertiary care.",
    link: "https://pmjay.gov.in",
  },
];

const STATUS_COLORS: Record<string, string> = {
  Open: "bg-blue-100 text-blue-700",
  Closed: "bg-gray-100 text-gray-600",
  Escalated: "bg-orange-100 text-orange-700",
  Pending: "bg-yellow-100 text-yellow-700",
  Dismissed: "bg-red-100 text-red-700",
};

export default async function UserDashboard() {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "user") redirect("/login");

  await connectDB();

  const [cases, appointments] = await Promise.all([
    Case.find({ citizen: session.id })
      .sort({ updatedAt: -1 })
      .limit(10)
      .lean(),
    Appointment.find({ citizen: session.id })
      .sort({ requestedAt: -1 })
      .limit(5)
      .lean(),
  ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text)]">
          Welcome back, {session.name}
        </h1>
        <p className="text-sm text-[var(--muted)] mt-1">
          Citizen Dashboard — JanmanIndia Legal Aid
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link
          href="/user/file-case"
          className="flex items-center gap-4 p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)] transition-colors group"
        >
          <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] font-bold text-lg group-hover:bg-[var(--accent)] group-hover:text-white transition-colors">
            +
          </div>
          <div>
            <p className="font-semibold text-[var(--text)]">File a Case</p>
            <p className="text-xs text-[var(--muted)]">Report injustice or legal issue</p>
          </div>
        </Link>

        <Link
          href="/user/sos"
          className="flex items-center gap-4 p-5 rounded-2xl bg-red-50 border border-red-200 hover:border-red-400 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center text-white font-bold text-lg">
            !
          </div>
          <div>
            <p className="font-semibold text-red-700">Emergency SOS</p>
            <p className="text-xs text-red-500">Send urgent alert to social worker</p>
          </div>
        </Link>

        <Link
          href="/user/appointments"
          className="flex items-center gap-4 p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)] transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-green-600 font-bold text-lg">
            C
          </div>
          <div>
            <p className="font-semibold text-[var(--text)]">Appointments</p>
            <p className="text-xs text-[var(--muted)]">Request or view appointments</p>
          </div>
        </Link>
      </div>

      {/* Case Tracker */}
      <section className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="font-semibold text-[var(--text)]">My Cases</h2>
          <Link href="/user/case-tracker" className="text-xs text-[var(--accent)] hover:underline">
            View all
          </Link>
        </div>
        {cases.length === 0 ? (
          <div className="px-6 py-8 text-center text-[var(--muted)] text-sm">
            No cases filed yet.{" "}
            <Link href="/user/file-case" className="text-[var(--accent)] hover:underline">
              File your first case.
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {cases.map((c) => {
              const lastDiary = c.caseDiary?.[c.caseDiary.length - 1];
              return (
                <div key={String(c._id)} className="px-6 py-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-[var(--text)] truncate">{c.caseTitle}</p>
                    <p className="text-xs text-[var(--muted)] mt-0.5">
                      #{c.caseNumber} &middot; {c.path === "criminal" ? "Criminal" : "High Court"}
                    </p>
                    {lastDiary && (
                      <p className="text-xs text-[var(--muted)] mt-1 line-clamp-1">
                        Last update: {lastDiary.findings}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <span
                      className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[c.status] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {c.status}
                    </span>
                    {c.nextHearingDate && (
                      <span className="text-xs text-[var(--muted)]">
                        Hearing:{" "}
                        {new Date(c.nextHearingDate).toLocaleDateString("en-IN")}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* RTPS Section */}
      <section>
        <h2 className="font-semibold text-[var(--text)] mb-4">Government Schemes & Rights</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {RTPS_GUIDES.map((guide) => (
            <a
              key={guide.title}
              href={guide.link}
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)] transition-colors"
            >
              <p className="font-medium text-sm text-[var(--text)]">{guide.title}</p>
              <p className="text-xs text-[var(--muted)] mt-1">{guide.description}</p>
            </a>
          ))}
        </div>
      </section>

      {/* Appointments */}
      <section className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="font-semibold text-[var(--text)]">Recent Appointments</h2>
          <Link href="/user/appointments" className="text-xs text-[var(--accent)] hover:underline">
            Manage
          </Link>
        </div>
        {appointments.length === 0 ? (
          <div className="px-6 py-6 text-sm text-[var(--muted)] text-center">
            No appointments yet.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {appointments.map((apt) => (
              <div key={String(apt._id)} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text)]">{apt.reason}</p>
                  <p className="text-xs text-[var(--muted)] mt-0.5">
                    {new Date(apt.proposedDate).toLocaleDateString("en-IN")}
                  </p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 capitalize">
                  {apt.status.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Training shortcut */}
      <section className="p-6 rounded-2xl bg-gradient-to-r from-[var(--accent)]/10 to-[var(--accent)]/5 border border-[var(--accent)]/20">
        <h2 className="font-semibold text-[var(--text)] mb-1">Legal Training Sessions</h2>
        <p className="text-sm text-[var(--muted)] mb-4">
          Watch free tutorials on your rights, schemes, and legal procedures.
        </p>
        <Link
          href="/training"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-[var(--accent-contrast)] text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Browse Training
        </Link>
      </section>
    </div>
  );
}
