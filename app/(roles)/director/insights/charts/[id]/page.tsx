import ChartEditPage from "@/components/insights/ChartEditPage";

export const metadata = { title: "Chart · Janman" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ChartEditPage id={id} />;
}
