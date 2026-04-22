import { redirect } from "next/navigation";
import Link from "next/link";
import mongoose from "mongoose";
import { getSessionFromCookies } from "@/lib/auth";
import { tryConnectDB } from "@/lib/mongoose";
import Case from "@/models/Case";
import Appointment from "@/models/Appointment";
import NoDBBanner from "@/components/shared/NoDBBanner";
import BentoCard from "@/components/ui/BentoCard";
import Spotlight from "@/components/ui/Spotlight";
import AnimatedShinyText from "@/components/ui/AnimatedShinyText";

const RTPS_GUIDES = [
  { title: "Right to Information",  hi: "RTI",         description: "Ask any government office for information — they must reply in 30 days.", link: "https://rtionline.gov.in",   accent: "#3b82f6" },
  { title: "MGNREGA",               hi: "मनरेगा",        description: "100 guaranteed days of paid rural work every year.",                       link: "https://nrega.nic.in",        accent: "#16a34a" },
  { title: "PM Awas Yojana",        hi: "पीएम आवास",    description: "Apply for affordable government housing.",                                 link: "https://pmaymis.gov.in",      accent: "#a855f7" },
  { title: "Ayushman Bharat",       hi: "आयुष्मान",      description: "Free hospital care up to ₹5 lakh per family per year.",                     link: "https://pmjay.gov.in",        accent: "#ef4444" },
];

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  Open:      { bg: "var(--info-bg, #dbeafe)",      color: "var(--info-text, #1e40af)" },
  Closed:    { bg: "var(--bg-secondary, #f3f4f6)", color: "var(--muted)" },
  Escalated: { bg: "var(--error-bg, #fee2e2)",     color: "var(--error-text, #b91c1c)" },
  Pending:   { bg: "var(--warning-bg, #fef3c7)",   color: "var(--warning-text, #92400e)" },
  Dismissed: { bg: "var(--error-bg, #fee2e2)",     color: "var(--error-text, #b91c1c)" },
};

interface CaseLean {
  _id: unknown; caseTitle: string; caseNumber: string; status: string;
  path?: "criminal" | "highcourt"; nextHearingDate?: Date;
  caseDiary?: { findings: string }[];
}
interface AptLean {
  _id: unknown; reason: string; proposedDate: Date; status: string;
}

export default async function CommunityDashboard() {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "community") redirect("/login");

  const dbOk = await tryConnectDB();
  let cases: CaseLean[] = [];
  let appointments: AptLean[] = [];

  if (dbOk && mongoose.Types.ObjectId.isValid(session.id)) {
    const userId = new mongoose.Types.ObjectId(session.id);
    [cases, appointments] = await Promise.all([
      Case.find({ citizen: userId }).sort({ updatedAt: -1 }).limit(10).lean() as unknown as Promise<CaseLean[]>,
      Appointment.find({ citizen: userId }).sort({ requestedAt: -1 }).limit(5).lean() as unknown as Promise<AptLean[]>,
    ]);
  }

  return (
    <div className="space-y-8">
      {!dbOk && <NoDBBanner />}

      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-(--border) bg-(--surface) px-6 sm:px-8 py-8">
        <Spotlight color="var(--accent)" />
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-widest text-(--accent) mb-2">Welcome back</p>
          <h1 className="text-3xl sm:text-4xl font-bold leading-tight">
            <AnimatedShinyText>Hi {session.name.split(" ")[0]}, what do you need help with today?</AnimatedShinyText>
          </h1>
          <p className="text-sm text-(--muted) mt-3 max-w-2xl">
            File a new case, raise an emergency alert, or browse government schemes you can apply for. Your assigned social worker is one tap away.
          </p>
        </div>
      </section>

      {/* Primary actions — bento */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <BentoCard href="/community/file-case" accent="var(--accent)"
          icon="📝"
          title="File a Case"
          description="Report an injustice — police refusal, land grab, denied scheme, etc.">
          <p className="text-xs text-(--muted) mt-2">A social worker reviews and assigns a lawyer.</p>
        </BentoCard>

        <BentoCard href="/community/sos" accent="#dc2626"
          icon="🚨"
          title="Emergency SOS"
          description="Send an urgent alert to your social worker.">
          <p className="text-xs text-(--muted) mt-2">For ongoing crimes or active danger only.</p>
        </BentoCard>

        <BentoCard href="/community/appointments" accent="#16a34a"
          icon="📅"
          title="Appointments"
          description="Request a meeting with a lawyer or social worker.">
          <p className="text-xs text-(--muted) mt-2">Pick a date — confirmation comes back to you.</p>
        </BentoCard>
      </section>

      {/* My cases */}
      <section className="bg-(--surface) rounded-2xl border border-(--border) overflow-hidden">
        <header className="px-6 py-4 border-b border-(--border) flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-(--text)">My Cases</h2>
            <p className="text-xs text-(--muted) mt-0.5">Everything you've filed and its current stage.</p>
          </div>
          <Link href="/community/case-tracker" className="text-xs font-semibold hover:underline" style={{ color: "var(--accent)" }}>
            View all →
          </Link>
        </header>
        {cases.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-3xl mb-2">📂</p>
            <p className="text-sm text-(--muted) mb-3">You haven't filed any cases yet.</p>
            <Link href="/community/file-case"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-(--accent-contrast)"
              style={{ background: "var(--accent)" }}>
              File your first case
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-(--border)">
            {cases.map((c) => {
              const lastDiary = c.caseDiary?.[c.caseDiary.length - 1];
              const st = STATUS_STYLE[c.status] ?? STATUS_STYLE.Closed;
              return (
                <div key={String(c._id)} className="px-6 py-4 flex items-start justify-between gap-4 hover:bg-(--bg) transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-(--text) truncate">{c.caseTitle}</p>
                    <p className="text-[11px] text-(--muted) mt-0.5">#{c.caseNumber} · {c.path === "criminal" ? "Criminal" : "High Court"}</p>
                    {lastDiary && <p className="text-xs text-(--muted) mt-1.5 line-clamp-1">📌 {lastDiary.findings}</p>}
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                      style={{ background: st.bg, color: st.color }}>
                      {c.status}
                    </span>
                    {c.nextHearingDate && (
                      <span className="text-[11px] text-(--muted)">
                        Hearing {new Date(c.nextHearingDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Government schemes — bento mosaic */}
      <section>
        <header className="mb-4">
          <h2 className="font-semibold text-(--text)">Schemes &amp; Rights you can use</h2>
          <p className="text-xs text-(--muted) mt-0.5">Free services from the government — tap to learn how to apply.</p>
        </header>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {RTPS_GUIDES.map((g) => (
            <a key={g.title} href={g.link} target="_blank" rel="noopener noreferrer">
              <BentoCard accent={g.accent} size="sm"
                icon="🏛️" title={g.title} description={g.hi}>
                <p className="text-xs text-(--muted) mt-2 leading-relaxed">{g.description}</p>
                <p className="text-[11px] mt-2 font-semibold" style={{ color: g.accent }}>Open official site →</p>
              </BentoCard>
            </a>
          ))}
        </div>
      </section>

      {/* Appointments + training side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="bg-(--surface) rounded-2xl border border-(--border) overflow-hidden">
          <header className="px-5 py-3 border-b border-(--border) flex items-center justify-between">
            <h2 className="font-semibold text-(--text) text-sm">Recent Appointments</h2>
            <Link href="/community/appointments" className="text-xs font-semibold hover:underline" style={{ color: "var(--accent)" }}>Manage →</Link>
          </header>
          {appointments.length === 0 ? (
            <p className="px-5 py-8 text-xs text-center text-(--muted)">No appointments yet.</p>
          ) : (
            <ul className="divide-y divide-(--border)">
              {appointments.map((apt) => (
                <li key={String(apt._id)} className="px-5 py-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm text-(--text) truncate">{apt.reason}</p>
                    <p className="text-[11px] text-(--muted) mt-0.5">{new Date(apt.proposedDate).toLocaleDateString("en-IN")}</p>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                    style={{ background: "var(--warning-bg, #fef3c7)", color: "var(--warning-text, #92400e)" }}>
                    {apt.status.replace("_", " ")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <Link href="/training" className="block">
          <div className="relative overflow-hidden rounded-2xl border h-full p-6"
            style={{
              background: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 12%, var(--surface)), var(--surface))",
              borderColor: "color-mix(in srgb, var(--accent) 25%, transparent)",
            }}>
            <Spotlight color="var(--accent)" />
            <div className="relative">
              <p className="text-2xl mb-2">🎓</p>
              <h2 className="font-semibold text-(--text)">Free Legal Training</h2>
              <p className="text-sm text-(--muted) mt-1 mb-4">Short videos on your rights, government schemes, and how to navigate police, courts, and offices.</p>
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: "var(--accent)" }}>
                Start learning →
              </span>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
