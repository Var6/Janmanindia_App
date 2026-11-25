import mongoose from "mongoose";
import type { JWTPayload } from "@/lib/auth";
import User from "@/models/User";
import { BadRequest } from "@/lib/insights/api";

/**
 * Who sees what in Insights.
 *
 * Directors and superadmins run the module: they build KPIs, charts and
 * dashboards, see data health, Explore and Copilot, and can open everything.
 * Other staff see only the dashboards and reports a director has shared with
 * their role or with them by name, read-only (they can change a dashboard's
 * filters and comment on a report). Community members never see Insights.
 */
export const ADMIN_ROLES = ["director", "superadmin"];
export const SHARE_ROLES = ["socialworker", "litigation", "hr", "finance", "administrator"];
export const VIEWER_ROLES = [...SHARE_ROLES, ...ADMIN_ROLES];

export const ROLE_NAMES: Record<string, string> = {
  socialworker: "Social workers", litigation: "Lawyers", hr: "HR", finance: "Finance", administrator: "Administrators",
};

export const isAdmin = (s: Pick<JWTPayload, "role">) => ADMIN_ROLES.includes(s.role);

type Shareable = { visibleTo?: string[]; sharedWith?: unknown[] };

export function canSee(doc: Shareable, s: Pick<JWTPayload, "role" | "id">): boolean {
  if (isAdmin(s)) return true;
  if ((doc.visibleTo ?? []).includes(s.role)) return true;
  return (doc.sharedWith ?? []).some((u) => String(u) === s.id);
}

/** Mongo filter for the dashboards / reports this person can open. */
export function visibleQuery(s: Pick<JWTPayload, "role" | "id">): Record<string, unknown> {
  if (isAdmin(s)) return {};
  return { $or: [{ visibleTo: s.role }, { sharedWith: new mongoose.Types.ObjectId(s.id) }] };
}

/** Active staff who can be given access (and can be @mentioned). */
export async function staffDirectory() {
  const users = await User.find({ role: { $in: VIEWER_ROLES }, isActive: true }).select("name role email").sort({ name: 1 }).lean();
  return users.map((u) => ({ _id: String(u._id), name: u.name, role: u.role, email: u.email as string | undefined }));
}

/** Validates { visibleTo, sharedWith } from a share dialog. */
export async function cleanSharing(body: Record<string, unknown>): Promise<{ visibleTo: string[]; sharedWith: mongoose.Types.ObjectId[] }> {
  const visibleTo = Array.isArray(body.visibleTo) ? [...new Set(body.visibleTo.map(String).filter((r) => SHARE_ROLES.includes(r)))] : [];
  const ids = Array.isArray(body.sharedWith) ? [...new Set(body.sharedWith.map(String))] : [];
  if (ids.some((i) => !mongoose.Types.ObjectId.isValid(i))) throw new BadRequest("Invalid person");
  if (ids.length > 200) throw new BadRequest("Share with a role instead of more than 200 people");
  const found = ids.length ? await User.countDocuments({ _id: { $in: ids }, role: { $in: VIEWER_ROLES }, isActive: true }) : 0;
  if (found !== ids.length) throw new BadRequest("Insights can only be shared with active staff");
  return { visibleTo, sharedWith: ids.map((i) => new mongoose.Types.ObjectId(i)) };
}
