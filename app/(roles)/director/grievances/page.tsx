// Directors get the same grievance inbox as HR. The /api/grievances endpoint
// is role-aware: directors/superadmin see ALL grievances — including the ones
// filed AGAINST HR, which are hidden from HR themselves. This is where those
// against-HR complaints land.
export { default } from "@/app/(roles)/hr/grievances/page";
