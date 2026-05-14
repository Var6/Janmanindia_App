import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import EventPipeline from "@/components/event-pipeline/EventPipeline";

export default async function Page() {
  const session = await getSessionFromCookies();
  const allowed = ["director", "superadmin"];
  if (!session || !allowed.includes(session.role)) redirect("/login");
  return <EventPipeline />;
}
