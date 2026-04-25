import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import { tryConnectDB } from "@/lib/mongoose";
import User from "@/models/User";
import NoDBBanner from "@/components/shared/NoDBBanner";
import PlvRequestsList from "@/components/shared/PlvRequestsList";

export default async function PlvRequestsInbox() {
  const session = await getSessionFromCookies();
  if (!session || !["socialworker", "director", "superadmin"].includes(session.role)) redirect("/login");

  const dbOk = await tryConnectDB();
  const requests = dbOk
    ? await User.find({ role: "community", "communityProfile.plvStatus": "requested" })
        .select("name email phone communityProfile createdAt")
        .sort({ "communityProfile.plvRequestedAt": 1 })
        .lean()
    : [];

  // Approved PLVs roster (recent decisions for context)
  const approved = dbOk
    ? await User.find({ role: "community", "communityProfile.plvStatus": "approved" })
        .select("name email communityProfile")
        .sort({ "communityProfile.plvDecidedAt": -1 })
        .limit(20)
        .lean()
    : [];

  return (
    <div className="space-y-6">
      {!dbOk && <NoDBBanner />}
      <div>
        <h1 className="text-2xl font-bold text-(--text)">PLV Requests</h1>
        <p className="text-sm text-(--muted) mt-1">
          Community members applying to join the Para Legal Volunteer programme. Review motivation, then approve or reject with a reason.
        </p>
      </div>

      <PlvRequestsList
        pending={requests.map(r => ({
          _id: String(r._id),
          name: r.name,
          email: r.email,
          phone: r.phone,
          motivation: r.communityProfile?.plvMotivation,
          requestedAt: r.communityProfile?.plvRequestedAt ? new Date(r.communityProfile.plvRequestedAt).toISOString() : undefined,
          district: r.communityProfile?.district,
        }))}
        approved={approved.map(r => ({
          _id: String(r._id),
          name: r.name,
          email: r.email,
          decidedAt: r.communityProfile?.plvDecidedAt ? new Date(r.communityProfile.plvDecidedAt).toISOString() : undefined,
          district: r.communityProfile?.district,
        }))}
      />
    </div>
  );
}
