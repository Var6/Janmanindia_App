import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import ResourceDirectory from "@/components/resources/ResourceDirectory";

export default async function LivelihoodPage() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");
  return <ResourceDirectory kind="livelihood" />;
}
