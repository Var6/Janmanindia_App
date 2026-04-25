"use client";

import ExpenseQueue, { type ExpenseItem } from "@/components/finance/ExpenseQueue";

interface Props {
  items: ExpenseItem[];
}

export default function FinancePayQueue({ items }: Props) {
  return (
    <ExpenseQueue
      title="Awaiting payment (director-approved)"
      items={items}
      action="mark_paid"
      empty="No approved expenses waiting to be paid out."
    />
  );
}
