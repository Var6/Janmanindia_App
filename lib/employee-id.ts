import User from "@/models/User";

const ROLE_PREFIX: Record<string, string> = {
  socialworker: "SW",
  litigation:   "LT",
  hr:           "HR",
  finance:      "FN",
  administrator: "AM",
  director:     "DR",
  superadmin:   "SA",
  community:    "CM",
};

/**
 * Generate the next sequential Employee ID for a role: e.g. JNM-SW-2026-0007.
 * Picks the highest existing sequence for the role+year and increments.
 */
export async function nextEmployeeId(role: string): Promise<string> {
  const prefix = ROLE_PREFIX[role] ?? "EM";
  const year = new Date().getFullYear();
  const stem = `JNM-${prefix}-${year}-`;

  const last = await User.findOne({ employeeId: { $regex: `^${stem}` } })
    .sort({ employeeId: -1 })
    .select("employeeId")
    .lean();

  let next = 1;
  if (last?.employeeId) {
    const tail = last.employeeId.slice(stem.length);
    const n = parseInt(tail, 10);
    if (!isNaN(n)) next = n + 1;
  }
  return `${stem}${String(next).padStart(4, "0")}`;
}
