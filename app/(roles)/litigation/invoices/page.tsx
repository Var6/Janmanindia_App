import { redirect } from "next/navigation";
import mongoose from "mongoose";
import { getSessionFromCookies } from "@/lib/auth";
import { tryConnectDB } from "@/lib/mongoose";
import EodReport from "@/models/EodReport";
import HeadLawyer from "@/models/HeadLawyer";
import User from "@/models/User";
import NoDBBanner from "@/components/shared/NoDBBanner";
import InvoiceApprovalList from "@/components/reports/InvoiceApprovalList";

export default async function LitigationInvoicesPage() {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "litigation") redirect("/login");

  const dbOk = await tryConnectDB();
  if (!dbOk) return <div className="space-y-6"><NoDBBanner /></div>;

  // Find districts where this user is the head lawyer
  const myHeads = await HeadLawyer.find({ user: new mongoose.Types.ObjectId(session.id) }).lean();
  const myDistricts = myHeads.map(h => h.district);

  // Submitters in those districts (litigation members)
  const eligibleSubmitters = myDistricts.length
    ? await User.find({
        role: "litigation",
        "litigationProfile.location.district": { $in: myDistricts },
      }).select("_id name email litigationProfile.location.district").lean()
    : [];

  const submitterIds = eligibleSubmitters.map(u => u._id);
  const queue = submitterIds.length
    ? await EodReport.find({
        invoiceStatus: "hr_verified",
        submittedBy: { $in: submitterIds },
      })
        .populate("submittedBy", "name email litigationProfile")
        .sort({ updatedAt: -1 })
        .lean()
    : [];

  const recent = submitterIds.length
    ? await EodReport.find({
        invoiceStatus: { $in: ["approved", "rejected"] },
        submittedBy: { $in: submitterIds },
      })
        .populate("submittedBy", "name email")
        .sort({ updatedAt: -1 })
        .limit(15)
        .lean()
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--text)">Invoice Approvals</h1>
        <p className="text-sm text-(--muted) mt-1 max-w-3xl">
          {myDistricts.length === 0
            ? "You are not the head lawyer for any district yet. The director assigns this role from the Head Lawyer Assignments page."
            : `You approve litigation invoices from ${myDistricts.join(", ")} after HR has verified them.`}
        </p>
      </div>

      {myDistricts.length > 0 && (
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
      )}
    </div>
  );
}
