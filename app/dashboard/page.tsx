"use client";

import Link from "next/link";
import { useSession } from "@/components/ui/SessionProvider";

function PanelCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm shadow-black/5">
      <h3 className="text-lg font-semibold text-[var(--text)]">{title}</h3>
      <div className="mt-4 text-sm leading-7 text-[var(--muted)]">{children}</div>
    </section>
  );
}

function ProgressRing({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg)] p-5 text-center">
      <p className="text-sm uppercase tracking-[0.24em] text-[var(--accent)]">{label}</p>
      <div className="mt-4 mx-auto flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-[var(--accent)]/15 to-transparent text-[var(--text)] shadow-lg shadow-[var(--accent)]/10">
        <span className="text-3xl font-bold">{value}%</span>
      </div>
      <p className="mt-4 text-sm text-[var(--muted)]">Case progress and status overview for your active matters.</p>
    </div>
  );
}

function MiniCalendar({ dates }: { dates: Array<{ date: string; label: string }> }) {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--text)]">Calendar</h3>
        <p className="text-sm text-[var(--muted)]">Upcoming dates</p>
      </div>
      <div className="mt-5 space-y-4">
        {dates.map((item) => (
          <div key={item.date} className="rounded-3xl border border-[var(--border)] bg-[var(--bg)] p-4 text-sm">
            <div className="font-semibold text-[var(--text)]">{item.date}</div>
            <div className="mt-1 text-[var(--muted)]">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CaseSummaryRow({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg)] p-4">
      <p className="font-semibold text-[var(--text)]">{title}</p>
      <p className="mt-2 text-sm text-[var(--accent)]">{value}</p>
      <p className="mt-2 text-sm text-[var(--muted)]">{detail}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useSession();

  if (!user) {
    return (
      <main className="min-h-screen bg-[var(--bg)] text-[var(--text)] px-6 py-16">
        <div className="mx-auto max-w-3xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-10 text-center shadow-2xl shadow-black/5">
          <h1 className="text-3xl font-semibold">Not signed in</h1>
          <p className="mt-4 text-[var(--muted)]">Please sign in to access your dashboard.</p>
          <Link href="/login" className="mt-8 inline-flex rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-[var(--accent-contrast)] transition hover:brightness-110">
            Go to Login
          </Link>
        </div>
      </main>
    );
  }

  const publicCases = [
    { title: "Request for help", description: "Submit a new case objective or legal assistance request so the team can assign an advocate." },
    { title: "Previous / ongoing updates", description: "Track open cases, review progress updates, and see the latest help notes from your support team." },
    { title: "Feedback & complaint", description: "Share confidential reports, feedback, or raise concerns about case handling and improvement needs." },
    { title: "Assigned advocate info", description: "See your assigned advocate, case updates, upcoming dates, and request follow-up or data from them." },
  ];

  const advocateTasks = [
    { title: "Assigned cases", value: "12", detail: "Cases with next hearing dates and client notes ready for action." },
    { title: "Paralegal requests", value: "5", detail: "Pending evidence, documents and data requests from paralegals." },
    { title: "Client messages", value: "8", detail: "Unread chats from clients and team members requiring a response." },
  ];

  const paralegalTasks = [
    { title: "Case support", value: "9", detail: "Active case tasks, evidence collection, and follow-up requests." },
    { title: "Team communication", value: "6", detail: "Advocate and client chat threads open for coordination." },
    { title: "Request status", value: "3", detail: "Pending requests to change paralegal or advocate assignment." },
  ];

  const adminCards = [
    { title: "Ongoing cases", value: "34", detail: "Current case status and distribution across districts." },
    { title: "Pending updates", value: "14", detail: "Cases with recent progress or schedule changes." },
    { title: "Team reviews", value: "5", detail: "Advocate / paralegal performance and feedback items." },
  ];

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)] px-6 py-16">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-2xl shadow-black/5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-[var(--accent)]">Dashboard</p>
              <h1 className="mt-3 text-3xl font-semibold">Welcome back, {user.name}</h1>
              <p className="mt-2 max-w-2xl text-[var(--muted)]">Your role: {user.role}. Manage cases, requests, communication, and timing from one place.</p>
            </div>
            <div className="flex flex-col gap-3 sm:items-end">
              <Link href="/settings" className="rounded-full border border-[var(--border)] bg-[var(--bg)] px-5 py-3 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface)]">
                Edit profile
              </Link>
              <Link href="/login" className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[var(--accent-contrast)] transition hover:brightness-110">
                Logout / Switch user
              </Link>
            </div>
          </div>
        </div>

        {user.role === "Public / Citizen" && (
          <>
            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="grid gap-6 sm:grid-cols-2">
                {publicCases.map((item) => (
                  <PanelCard key={item.title} title={item.title}>
                    {item.description}
                  </PanelCard>
                ))}
              </div>
              <div className="space-y-6">
                <ProgressRing label="Overall case health" value={72} />
                <MiniCalendar
                  dates={[
                    { date: "24 Apr 2025", label: "Court hearing update review" },
                    { date: "29 Apr 2025", label: "Lawyer request response due" },
                    { date: "05 May 2025", label: "Evidence submission deadline" },
                  ]}
                />
              </div>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <CaseSummaryRow title="Assigned Advocate" value={user.assignedLawyer ?? "Not assigned"} detail="Your main advocate for the current case." />
              <CaseSummaryRow title="Assigned Paralegal" value={user.assignedParalegal ?? "Not assigned"} detail="The paralegal supporting document and community outreach." />
            </div>
          </>
        )}

        {user.role === "Advocate / Lawyer" && (
          <>
            <div className="grid gap-6 lg:grid-cols-3">
              {advocateTasks.map((item) => (
                <CaseSummaryRow key={item.title} title={item.title} value={item.value} detail={item.detail} />
              ))}
            </div>
            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <PanelCard title="Next case date">
                Your top priority case is scheduled for 30 Apr 2025. Confirm filing status, client evidence, and witness availability before the hearing.
              </PanelCard>
              <MiniCalendar
                dates={[
                  { date: "30 Apr 2025", label: "Hearing preparation deadline" },
                  { date: "03 May 2025", label: "Paralegal data request follow-up" },
                  { date: "10 May 2025", label: "Client consultation slot" },
                ]}
              />
            </div>
            <PanelCard title="Communication & research">
              Review all active client chat threads, coordinate evidence requests with paralegal colleagues, and use the AI research section for legal precedents and case strategy notes.
            </PanelCard>
          </>
        )}

        {user.role === "Paralegal" && (
          <>
            <div className="grid gap-6 lg:grid-cols-3">
              {paralegalTasks.map((item) => (
                <CaseSummaryRow key={item.title} title={item.title} value={item.value} detail={item.detail} />
              ))}
            </div>
            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <PanelCard title="Client coordination">
                Handle new evidence collection, file status updates, and change requests for paralegal or advocate assignment. Keep approvals ready for advocate review.
              </PanelCard>
              <MiniCalendar
                dates={[
                  { date: "26 Apr 2025", label: "Document collection deadline" },
                  { date: "28 Apr 2025", label: "Advocate briefing session" },
                  { date: "02 May 2025", label: "Community outreach report" },
                ]}
              />
            </div>
          </>
        )}

        {user.role === "Admin" && (
          <>
            <div className="grid gap-6 lg:grid-cols-3">
              {adminCards.map((item) => (
                <CaseSummaryRow key={item.title} title={item.title} value={item.value} detail={item.detail} />
              ))}
            </div>
            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <PanelCard title="Operations overview">
                Monitor case flow, review status updates, and manage assignments. Use the dashboard to see whether cases are on-track, delayed, or require escalation.
              </PanelCard>
              <MiniCalendar
                dates={[
                  { date: "25 Apr 2025", label: "Weekly case review meeting" },
                  { date: "29 Apr 2025", label: "Advocate/paralegal assignment audit" },
                  { date: "04 May 2025", label: "Update dashboard metrics" },
                ]}
              />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
