import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import { tryConnectDB } from "@/lib/mongoose";
import EodReport from "@/models/EodReport";
import HeadLawyer from "@/models/HeadLawyer";
import User from "@/models/User";
import NoDBBanner from "@/components/shared/NoDBBanner";
import InvoiceApprovalList from "@/components/reports/InvoiceApprovalList";

export default async function DirectorInvoicesPage() {
  const session = await getSessionFromCookies();
  if (!session || !["director", "superadmin"].includes(session.role)) redirect("/login");

  const dbOk = await tryConnectDB();
  if (!dbOk) return <div className="space-y-6"><NoDBBanner /></div>;

  const heads = await HeadLawyer.find({}).select("district").lean();
  const coveredDistricts = heads.map(h => h.district);

  // Litigation submitters in districts that have NO head lawyer (and submitters with no district)
  const fallbackSubmitters = await User.find({
    role: "litigation",
    $or: [
      { "litigationProfile.location.district": { $nin: coveredDistricts } },
      { "litigationProfile.location.district": { $in: [null, ""] } },
      { "litigationProfile.location.district": { $exists: false } },
    ],
  }).select("_id name email litigationProfile").lean();

  const submitterIds = fallbackSubmitters.map(u => u._id);
  const queue = submitterIds.length
    ? await EodReport.find({
        invoiceStatus: "hr_verified",
        submittedBy: { $in: submitterIds },
      })
        .populate("submittedBy", "name email litigationProfile")
        .sort({ updatedAt: -1 })
        .lean()
    : [];

  const recent = await EodReport.find({ invoiceStatus: { $in: ["approved", "rejected"] } })
    .populate("submittedBy", "name email")
    .sort({ updatedAt: -1 })
    .limit(20)
    .lean();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--text)">Litigation Invoices — Director Approval</h1>
        <p className="text-sm text-(--muted) mt-1 max-w-3xl">
          Litigation invoices for districts with no assigned head lawyer come here. Assign more head lawyers from
          the <span className="font-semibold">Head Lawyer Assignments</span> page to delegate.
        </p>
      </div>

      <InvoiceApprovalList
        pending={queue.map(r => ({
          _id: String(r._id),
          date: new Date(r.date).toISOString(),
          summary: r.summary,
          hoursWorked: r.hoursWorked,
          expenses: r.expenses,
          invoiceUrl: r.invoiceUrl,
          submittedBy: r.submittedBy ? {
            _id: String((r.submittedBy as { _id: unknown })._id),
            name: (r.submittedBy as { name?: string }).name ?? "—",
            email: (r.submittedBy as { email?: string }).email ?? "",
            district: (r.submittedBy as { litigationProfile?: { location?: { district?: string } } }).litigationProfile?.location?.district,
          } : null,
          hrNotes: r.hrNotes,
        }))}
        recent={recent.map(r => ({
          _id: String(r._id),
          status: r.invoiceStatus,
          summary: r.summary,
          submitter: (r.submittedBy as { name?: string } | null)?.name ?? "—",
          updatedAt: new Date(r.updatedAt as unknown as string).toISOString(),
          amount: r.expenses.reduce((s, e) => s + e.amount, 0),
          rejectionReason: r.rejectionReason,
        }))}
      />
    </div>
  );
}
