import Link from "next/link";
import DashboardView from "@/components/insights/DashboardView";

export const metadata = { title: "Dashboard · Janman" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="space-y-4">
      <Link href="/insights" className="text-sm text-(--muted) hover:text-(--accent)">← Insights shared with you</Link>
      <DashboardView id={id} mode="viewer" />
    </div>
  );
}
