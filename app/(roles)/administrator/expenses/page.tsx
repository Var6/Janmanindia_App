"use client";

import { useEffect, useState } from "react";
import SubmitExpenseForm from "@/components/finance/SubmitExpenseForm";
import ExpenseQueue, { type ExpenseItem } from "@/components/finance/ExpenseQueue";
import { SkeletonRow } from "@/components/ui/Skeleton";
import { useT } from "@/components/i18n/LanguageProvider";

export default function AdministratorExpensesPage() {
  const t = useT();
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const res = await fetch("/api/expenses?mine=true");
      const data = await res.json();
      setItems(data.expenses ?? []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  const open  = items.filter(x => ["submitted", "hr_verified", "director_approved"].includes(x.status));
  const past  = items.filter(x => ["paid", "rejected"].includes(x.status));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-(--text)">{t("My Expenses")}</h1>
          <p className="text-sm text-(--muted) mt-1 max-w-3xl">
            {t("Submit logistics and admin spending — pens, stationery, AC repair, table & chair, electricals, equipment. HR verifies, the director approves, finance pays.")}
          </p>
        </div>
        <SubmitExpenseForm onCreated={load} />
      </div>

      {loading ? (
        <div className="rounded-2xl border divide-y divide-(--border)"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-5 py-4"><SkeletonRow trailing={true} /></div>
          ))}
        </div>
      ) : (
        <>
          <ExpenseQueue title={t("In progress")} items={open} empty={t("Nothing pending — submit a new expense above.")} />
          {past.length > 0 && <ExpenseQueue title={t("Past expenses")} items={past} />}
        </>
      )}
    </div>
  );
}
