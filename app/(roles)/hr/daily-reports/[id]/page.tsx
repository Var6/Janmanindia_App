"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import DailyReportForm from "@/components/reports/DailyReportForm";

export default function HrDailyReportDetail() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [report, setReport] = useState(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/daily-reports/${id}`)
      .then(r => r.json())
      .then(d => setReport(d.report))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="text-sm text-(--muted)">Loading…</p>;
  if (!report) return <p className="text-sm text-(--error-text)">Report not found.</p>;

  return (
    <div className="space-y-4">
      <Link href="/hr/daily-reports" className="text-xs text-(--muted) hover:text-(--text)">← Back to all daily reports</Link>
      <DailyReportForm canEdit={false} isSupervisor initialReport={report} />
    </div>
  );
}
