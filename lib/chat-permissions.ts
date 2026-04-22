/**
 * Permission rules for who-can-DM-whom:
 *  - community can DM only socialworker (and vice versa)
 *  - all other staff roles (sw, lit, hr, finance, administrator, director, superadmin) can DM each other freely
 *  - community ↔ community is blocked
 */
export function canDirectMessage(roleA: string, roleB: string): boolean {
  if (roleA === "community" && roleB === "community") return false;
  if (roleA === "community") return roleB === "socialworker";
  if (roleB === "community") return roleA === "socialworker";
  // staff ↔ staff
  return true;
}
