import type { NavItem } from "@/components/shared/SidebarNav";

/** Items every authenticated user sees (regardless of role). */
const SHARED_ITEMS: NavItem[] = [
  { href: "/appointments", label: "Appointments", icon: "calendar"  },
  { href: "/chat",         label: "Chat",         icon: "chat"      },
  { href: "/grievance",    label: "Grievance",    icon: "alert"     },
  { href: "/training",     label: "Training",     icon: "book"      },
  { href: "/policies",     label: "Policies",     icon: "shield"    },
];

/** Role-specific items, ordered top-to-bottom in the sidebar. */
const ROLE_ITEMS: Record<string, NavItem[]> = {
  community: [
    { href: "/community",              label: "Dashboard",    icon: "home"        },
    { href: "/community/file-case",    label: "File a Case",  icon: "file-plus"   },
    { href: "/community/sos",          label: "SOS",          icon: "bell"        },
    { href: "/community/rtps",         label: "RTPS",         icon: "file-text"   },
    { href: "/community/case-tracker", label: "Case Tracker", icon: "search"      },
    { href: "/community/appointments", label: "Appointments", icon: "calendar"    },
  ],
  socialworker: [
    { href: "/socialworker",                label: "Dashboard",      icon: "home"        },
    { href: "/socialworker/cases",          label: "Cases",          icon: "briefcase"   },
    { href: "/socialworker/care-plans",     label: "Care Plans",     icon: "user-circle" },
    { href: "/socialworker/queries",        label: "Queries",        icon: "search"      },
    { href: "/socialworker/plv-requests",   label: "PLV Requests",   icon: "users"       },
    { href: "/socialworker/escalate",       label: "Escalate",       icon: "alert"       },
    { href: "/socialworker/reports",        label: "EOD Reports",    icon: "document"    },
    { href: "/socialworker/media-scanning", label: "Media Scanning", icon: "upload"      },
  ],
  litigation: [
    { href: "/litigation",              label: "Dashboard",    icon: "home"      },
    { href: "/litigation/cases",        label: "Cases",        icon: "briefcase" },
    { href: "/litigation/reports",      label: "EOD Reports",  icon: "document"  },
    { href: "/litigation/invoices",     label: "Invoice Approvals", icon: "receipt" },
    { href: "/litigation/appointments", label: "Appointments", icon: "calendar"  },
  ],
  hr: [
    { href: "/hr",                       label: "Dashboard",       icon: "home"       },
    { href: "/hr/invoices",              label: "Invoices",        icon: "receipt"    },
    { href: "/hr/expense-verification",  label: "Expense Verify",  icon: "currency"   },
    { href: "/hr/attendance",            label: "Attendance",      icon: "clock"      },
    { href: "/hr/onboarding",            label: "Onboarding",      icon: "user-plus"  },
    { href: "/hr/offboarding",           label: "Offboarding",     icon: "user-minus" },
    { href: "/hr/grievances",            label: "Grievances",      icon: "alert"      },
    { href: "/hr/helplines",             label: "Helplines",       icon: "bell"       },
  ],
  finance: [
    { href: "/finance",          label: "Dashboard",   icon: "home"        },
    { href: "/finance/expenses", label: "Expenses",    icon: "currency"    },
    { href: "/finance/salaries", label: "Salaries",    icon: "credit-card" },
  ],
  administrator: [
    { href: "/administrator",          label: "Dashboard",    icon: "home"      },
    { href: "/administrator/expenses", label: "My Expenses",  icon: "currency"  },
    { href: "/administrator/tickets",  label: "Ticket Inbox", icon: "alert"     },
    { href: "/administrator/offices",  label: "Offices",      icon: "briefcase" },
  ],
  director: [
    { href: "/director",                    label: "Dashboard",         icon: "home"        },
    { href: "/director/cases",              label: "Cases",             icon: "briefcase"   },
    { href: "/director/users",              label: "Users",             icon: "users"       },
    { href: "/director/assign",             label: "Assign",            icon: "refresh"     },
    { href: "/director/head-lawyers",       label: "Head Lawyers",      icon: "shield"      },
    { href: "/director/invoices",           label: "Invoice Approvals", icon: "receipt"     },
    { href: "/director/expense-approvals",  label: "Expense Approvals", icon: "currency"    },
  ],
  superadmin: [
    { href: "/superadmin",          label: "Overview",      icon: "shield"      },
    { href: "/superadmin/projects", label: "Projects",      icon: "briefcase"   },
    { href: "/director",            label: "Director",      icon: "settings"    },
    { href: "/hr",                  label: "HR",            icon: "users"       },
    { href: "/finance",             label: "Finance",       icon: "trending-up" },
    { href: "/administrator",       label: "Administrator", icon: "briefcase"   },
  ],
};

/** Cross-role utility items. Activities is staff-only (community gated out). */
const STAFF_ITEMS: NavItem[] = [
  { href: "/activities", label: "Activities", icon: "calendar"  },
  { href: "/logistics",  label: "Logistics",  icon: "briefcase" },
];

const PROFILE_ITEM = (role: string): NavItem => ({
  href: `/${role}/profile`,
  label: "My Profile",
  icon: "user-circle",
});

/** Build the full sidebar for a given role. */
export function navItemsFor(role: string): NavItem[] {
  const base = ROLE_ITEMS[role] ?? [];
  // Community gets no logistics tile (they don't need org-internal logistics).
  const utility = role === "community" ? [] : STAFF_ITEMS;
  // Finance team doesn't need training in their sidebar — they manage money, not learning.
  const shared = role === "finance" ? SHARED_ITEMS.filter(i => i.href !== "/training") : SHARED_ITEMS;
  return [...base, ...utility, ...shared, PROFILE_ITEM(role)];
}

export const ROLE_LABELS: Record<string, string> = {
  community:     "Community Portal",
  socialworker:  "Social Worker",
  litigation:    "Litigation Team",
  hr:            "HR Department",
  finance:       "Finance",
  administrator: "Administrator",
  director:      "Director",
  superadmin:    "Super Admin",
};
