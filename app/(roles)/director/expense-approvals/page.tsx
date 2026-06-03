import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import { tryConnectDB } from "@/lib/mongoose";
import Expense from "@/models/Expense";
import "@/models/Project"; // register schema for populate
import "@/models/Case";    // register schema for populate (case-scoped expenses)
import "@/models/User";
import NoDBBanner from "@/components/shared/NoDBBanner";
import ExpenseQueue, { type ExpenseItem } from "@/components/finance/ExpenseQueue";
import { getServerT } from "@/lib/i18n-server";

export default async function DirectorExpenseApprovalsPage() {
  const session = await getSessionFromCookies();
  if (!session || !["director", "superadmin"].includes(session.role)) redirect("/login");
  const t = await getServerT();

  const dbOk = await tryConnectDB();
  if (!dbOk) return <div className="space-y-6"><NoDBBanner /></div>;

  const [pending, recent] = await Promise.all([
    Expense.find({ status: "hr_verified" })
      .sort({ submittedAt: 1 })
      .populate("project", "code name")
      .populate("case", "caseNumber caseTitle")
      .populate("submittedBy", "name email role")
      .populate("hrVerification.by", "name")
      .lean(),
    Expense.find({ status: { $in: ["director_approved", "paid", "rejected"] } })
      .sort({ updatedAt: -1 })
      .limit(20)
      .populate("project", "code name")
      .populate("case", "caseNumber caseTitle")
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
        <h1 className="text-2xl font-bold text-(--text)">{t("Expense Approvals")}</h1>
        <p className="text-sm text-(--muted) mt-1 max-w-3xl">
          {t("HR-verified expenses await your sign-off. Approving sends them to finance for payment; rejecting closes them with a reason.")}
        </p>
      </div>

      <ExpenseQueue title={t("Awaiting your approval")} items={pending as unknown as ExpenseItem[]}
        action="director_approve" allowReject empty={t("Inbox empty.")} />
      <ExpenseQueue title={t("Recently processed")} items={recent as unknown as ExpenseItem[]} />
    </div>
  );
}
