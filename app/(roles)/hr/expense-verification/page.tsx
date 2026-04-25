import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import { tryConnectDB } from "@/lib/mongoose";
import Expense from "@/models/Expense";
import "@/models/Project"; // register schema for populate
import "@/models/User";
import NoDBBanner from "@/components/shared/NoDBBanner";
import ExpenseQueue, { type ExpenseItem } from "@/components/finance/ExpenseQueue";

export default async function HrExpenseVerificationPage() {
  const session = await getSessionFromCookies();
  if (!session || !["hr", "director", "superadmin"].includes(session.role)) redirect("/login");

  const dbOk = await tryConnectDB();
  if (!dbOk) return <div className="space-y-6"><NoDBBanner /></div>;

  const [pending, recent] = await Promise.all([
    Expense.find({ status: "submitted" })
      .sort({ submittedAt: 1 })
      .populate("project", "code name")
      .populate("submittedBy", "name email role")
      .lean(),
    Expense.find({ status: { $in: ["hr_verified", "director_approved", "paid", "rejected"] } })
      .sort({ updatedAt: -1 })
      .limit(20)
      .populate("project", "code name")
      .populate("submittedBy", "name email role")
      .populate("hrVerification.by", "name")
      .populate("directorApproval.by", "name")
      .populate("payment.by", "name")
      .populate("rejection.by", "name")
      .lean(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--text)">Expense Verification</h1>
        <p className="text-sm text-(--muted) mt-1 max-w-3xl">
          Verify expenses submitted by administrators and staff. Verifying forwards them to the director for approval.
        </p>
      </div>

      <ExpenseQueue title="Awaiting your verification" items={pending as unknown as ExpenseItem[]}
        action="hr_verify" allowReject empty="Inbox empty." />
      <ExpenseQueue title="Recently processed" items={recent as unknown as ExpenseItem[]} />
    </div>
  );
}
