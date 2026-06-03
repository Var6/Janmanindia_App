"use client";

import ExpenseQueue, { type ExpenseItem } from "@/components/finance/ExpenseQueue";
import { useT } from "@/components/i18n/LanguageProvider";

interface Props {
  items: ExpenseItem[];
}

export default function FinancePayQueue({ items }: Props) {
  const t = useT();
  return (
    <ExpenseQueue
      title={t("Awaiting payment (director-approved)")}
      items={items}
      action="mark_paid"
      empty={t("No approved expenses waiting to be paid out.")}
    />
  );
}
