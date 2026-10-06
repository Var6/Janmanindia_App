import Case from "@/models/Case";

/** Statuses that mean a case still needs work. Disposal / Withdrawn / Closed /
 *  Dismissed are finished. */
export const LIVE_CASE_STATUSES = ["Open", "Pending", "Escalated"] as const;

/**
 * Live-case count per litigation member, computed from the cases themselves.
 *
 * Replaces `litigationProfile.activeCaseCount`, a stored counter that was only
 * ever incremented by auto-assign (never on manual assignment, reassignment,
 * disposal or import), so it read 0 for almost everyone. A case counts for
 * every member in `litigationMembers`; older rows that only have the lead
 * `litigationMember` count for that lead.
 */
export async function liveCaseCountsByMember(): Promise<Map<string, number>> {
  const rows = await Case.aggregate<{ _id: unknown; count: number }>([
    { $match: { isPrivate: { $ne: true }, status: { $in: [...LIVE_CASE_STATUSES] } } },
    {
      $project: {
        members: {
          $cond: [
            { $gt: [{ $size: { $ifNull: ["$litigationMembers", []] } }, 0] },
            "$litigationMembers",
            { $cond: [{ $ifNull: ["$litigationMember", false] }, ["$litigationMember"], []] },
          ],
        },
      },
    },
    { $unwind: "$members" },
    { $group: { _id: "$members", count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.count]));
}
