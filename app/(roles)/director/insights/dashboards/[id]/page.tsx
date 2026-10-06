import DashboardView from "@/components/insights/DashboardView";

export const metadata = { title: "Dashboard · Janman" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DashboardView id={id} />;
}
