import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import { tryConnectDB } from "@/lib/mongoose";
import EodReport from "@/models/EodReport";
import NoDBBanner from "@/components/shared/NoDBBanner";
import HrInvoiceQueue from "@/components/reports/HrInvoiceQueue";

export default async function HrInvoicesPage() {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "hr" && session.role !== "superadmin" && session.role !== "director")) redirect("/login");

  const dbOk = await tryConnectDB();
  const reports = dbOk
    ? await EodReport.find({})
        .populate("submittedBy", "name email role litigationProfile")
        .sort({ createdAt: -1 })
        .limit(150)
        .lean()
    : [];

  const pending     = reports.filter(r => r.invoiceStatus === "pending");
  const hrVerified  = reports.filter(r => r.invoiceStatus === "hr_verified");
  const finalised   = reports.filter(r => r.invoiceStatus === "approved" || r.invoiceStatus === "rejected").slice(0, 30);

  type Lean = (typeof reports)[number];
  const toItem = (r: Lean) => {
    const sub = r.submittedBy as unknown as { _id?: unknown; name?: string; email?: string; role?: string; litigationProfile?: { location?: { district?: string } } } | null;
    return {
      _id: String(r._id),
      date: new Date(r.date).toISOString(),
      summary: r.summary,
      hoursWorked: r.hoursWorked,
      expenses: r.expenses,
      invoiceUrl: r.invoiceUrl,
      submitterName: sub?.name ?? "—",
      submitterEmail: sub?.email ?? "",
      submitterRole: r.submitterRole ?? sub?.role ?? "",
      submitterDistrict: sub?.litigationProfile?.location?.district,
      status: r.invoiceStatus,
      hrNotes: r.hrNotes,
      rejectionReason: r.rejectionReason,
      amount: r.expenses.reduce((s, ex) => s + ex.amount, 0),
    };
  };

  return (
    <div className="space-y-8">
      {!dbOk && <NoDBBanner />}

      <div>
        <h1 className="text-2xl font-bold text-(--text)">Invoice Review</h1>
        <p className="text-sm text-(--muted) mt-1 max-w-3xl">
          Verify expense claims from social workers and litigation members. Verifying a litigation invoice forwards it to the
          district's head lawyer (or to the director if none is assigned). Social-worker invoices are approved here in one step.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Pending" count={pending.length}    bg="var(--warning-bg)"  color="var(--warning-text)" />
        <Stat label="Forwarded to Lawyers" count={hrVerified.length} bg="var(--info-bg)" color="var(--info-text)" />
        <Stat label="Approved" count={finalised.filter(r => r.invoiceStatus === "approved").length} bg="var(--success-bg)" color="var(--success-text)" />
        <Stat label="Rejected" count={finalised.filter(r => r.invoiceStatus === "rejected").length} bg="var(--error-bg)"   color="var(--error-text)" />
      </div>

      <HrInvoiceQueue pending={pending.map(toItem)} forwarded={hrVerified.map(toItem)} recent={finalised.map(toItem)} />
    </div>
  );
}

function Stat({ label, count, bg, color }: { label: string; count: number; bg: string; color: string }) {
  return (
    <div className="rounded-xl border p-4" style={{ background: bg, borderColor: `color-mix(in srgb, ${color} 25%, transparent)` }}>
      <p className="text-2xl font-bold" style={{ color }}>{count}</p>
      <p className="text-xs mt-0.5 font-medium" style={{ color }}>{label}</p>
    </div>
  );
}
