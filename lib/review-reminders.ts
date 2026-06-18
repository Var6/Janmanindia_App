import Case from "@/models/Case";
import CaseReview from "@/models/CaseReview";
import Notification from "@/models/Notification";
import User from "@/models/User";

/** Days after case creation that the monthly review is due. */
const REVIEW_DUE_DAYS = 30;
/** Grace days after the due date before directors are notified. */
const OVERDUE_GRACE_DAYS = 2;

const FINAL_STATUSES = ["Closed", "Dismissed", "Disposal", "Withdrawn"];
const DIRECTOR_ROLES = ["director", "superadmin", "administrator"];

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Find cases whose 1-month review is overdue by the grace period and whose
 * litigation member still hasn't written a review, then notify the directors
 * (once per case). Idempotent: a second run won't duplicate notifications.
 *
 * Returns the number of new notifications created.
 */
export async function runReviewOverdueCheck(): Promise<number> {
  const cutoff = new Date(Date.now() - (REVIEW_DUE_DAYS + OVERDUE_GRACE_DAYS) * DAY_MS);

  // Candidate cases: active, old enough, and actually assigned to a lawyer.
  const cases = await Case.find({
    status: { $nin: FINAL_STATUSES },
    createdAt: { $lte: cutoff },
    $or: [
      { litigationMember: { $exists: true, $ne: null } },
      { "litigationMembers.0": { $exists: true } },
    ],
  })
    .select("caseNumber caseTitle litigationMember litigationMembers")
    .lean();

  if (cases.length === 0) return 0;

  const directors = await User.find({ role: { $in: DIRECTOR_ROLES }, isActive: true })
    .select("_id")
    .lean();
  if (directors.length === 0) return 0;

  let created = 0;
  for (const c of cases) {
    const caseId = String(c._id);

    // Already reviewed? Then nothing is overdue.
    const hasReview = await CaseReview.exists({ case: c._id });
    if (hasReview) continue;

    // Already notified the directors for this case? De-dupe.
    const already = await Notification.exists({ type: "review_overdue", "meta.caseId": caseId });
    if (already) continue;

    const leadId = c.litigationMember ?? (c.litigationMembers ?? [])[0];
    let leadName = "The assigned advocate";
    if (leadId) {
      const lead = await User.findById(leadId).select("name").lean();
      if (lead?.name) leadName = lead.name;
    }

    const title = "Case review overdue";
    const body = `${leadName} hasn't written the 1-month review for ${c.caseNumber ?? c.caseTitle ?? "a case"}.`;
    await Notification.insertMany(
      directors.map((d) => ({
        recipient: d._id,
        type: "review_overdue",
        title,
        body,
        link: `/director/cases/${caseId}`,
        meta: { caseId },
        read: false,
      }))
    );
    created += directors.length;
  }
  return created;
}
