import type { NavItem } from "@/components/shared/SidebarNav";

/** Items every authenticated user sees (regardless of role). Icons are
 *  chosen so no two items in any one user's sidebar share a glyph. */
const SHARED_ITEMS: NavItem[] = [
  { href: "/appointments", label: "Appointments", icon: "calendar"  },
  { href: "/chat",         label: "Chat",         icon: "chat"      },
  { href: "/grievance",    label: "Grievance",    icon: "flame"     },
  { href: "/training",     label: "Training",     icon: "book"      },
  { href: "/policies",     label: "Policies",     icon: "scroll"    },
];

/** Role-specific items, ordered top-to-bottom in the sidebar. */
const ROLE_ITEMS: Record<string, NavItem[]> = {
  // Community has no case-filing entry — they're read-only viewers of cases
  // a social worker / lawyer files for them. Adding existing cases is a
  // litigation responsibility, not a community one.
  //
  // Sidebar is intentionally collapsed:
  //  - "Help & Support" lands on /community/speak-to-us, which (along with
  //    /community/sos and /chat) shares a tab strip so all three help
  //    pathways live under one menu item.
  //  - "Cases & Appointments" lands on /community/case-tracker; that page
  //    and /community/appointments share their own tab strip too.
  community: [
    { href: "/community",                label: "Dashboard",            icon: "home"      },
    // "Help & Support" is the consolidated entry point for Speak to Us,
    // SOS, and Chat — each rendered as a tab inside the others so a
    // community member can switch between them in one click.
    { href: "/community/speak-to-us",    label: "Help & Support",       icon: "mic"       },
    // "Cases & Appointments" lands on the case tracker; appointments live
    // on a sibling tab.
    { href: "/community/case-tracker",   label: "Cases & Appointments", icon: "briefcase" },
    { href: "/community/rtps",           label: "RTPS",                 icon: "file-text" },
    { href: "/schemes",                  label: "Schemes",              icon: "scroll"    },
    { href: "/livelihood",               label: "Livelihood",           icon: "currency"  },
    { href: "/activities",               label: "Campaigns",            icon: "target"    },
  ],
  socialworker: [
    { href: "/socialworker",                 label: "Dashboard",      icon: "home"        },
    { href: "/socialworker/cases",           label: "Cases",          icon: "scale"       },
    { href: "/socialworker/care-plans",      label: "Care Plans",     icon: "user-circle" },
    { href: "/socialworker/daily-reports",   label: "Daily Reports",  icon: "document"    },
    { href: "/socialworker/queries",         label: "Queries",        icon: "search"      },
    { href: "/socialworker/plv-requests",    label: "PLV Requests",   icon: "users"       },
    { href: "/schemes",                       label: "Schemes",        icon: "scroll"      },
    { href: "/livelihood",                    label: "Livelihood",     icon: "credit-card" },
    { href: "/socialworker/escalate",        label: "Escalate",       icon: "target"      },
    { href: "/socialworker/voice-messages",  label: "Voice Messages", icon: "mic"         },
    { href: "/socialworker/media-scanning",  label: "Media Scanning", icon: "upload"      },
    { href: "/socialworker/aangan",          label: "Aangan (Child)", icon: "shield"      },
  ],
  litigation: [
    { href: "/litigation",              label: "Dashboard",    icon: "home"      },
    { href: "/litigation/cases",        label: "Cases",        icon: "scale"     },
    { href: "/litigation/sos",          label: "SOS Alerts",   icon: "flame"     },
    { href: "/litigation/tools",        label: "Legal Tools",  icon: "gavel"     },
    { href: "/litigation/reports",      label: "Daily Report", icon: "document"  },
    // Invoice / expense approval is finance / director / HR's responsibility,
    // not litigation's. The /litigation/invoices route still exists for the
    // head-lawyer escrow flow, but we don't surface it in the sidebar so
    // litigation members aren't given the impression they can sign off on
    // money.
    // /litigation/appointments was merged into the shared /appointments hub.
  ],
  hr: [
    { href: "/hr",                       label: "Dashboard",       icon: "home"       },
    { href: "/hr/invoices",              label: "Invoices",        icon: "receipt"    },
    { href: "/hr/expense-verification",  label: "Expense Verify",  icon: "currency"   },
    { href: "/hr/daily-reports",         label: "Daily Reports",   icon: "document"   },
    { href: "/hr/attendance",            label: "Attendance",      icon: "clock"      },
    { href: "/hr/onboarding",            label: "Onboarding",      icon: "user-plus"  },
    { href: "/hr/offboarding",           label: "Offboarding",     icon: "user-minus" },
    { href: "/hr/grievances",            label: "Grievances",      icon: "inbox"      },
    { href: "/hr/helplines",             label: "Helplines",       icon: "bell"       },
  ],
  finance: [
    { href: "/finance",          label: "Dashboard",   icon: "home"        },
    { href: "/finance/expenses", label: "Expenses",    icon: "currency"    },
    { href: "/finance/salaries", label: "Salaries",    icon: "credit-card" },
  ],
  administrator: [
    { href: "/administrator",          label: "Dashboard",     icon: "home"       },
    { href: "/administrator/calendar", label: "Team Calendar", icon: "users-team" },
    { href: "/administrator/assign",   label: "Assign Tasks",  icon: "refresh"    },
    { href: "/administrator/expenses", label: "My Expenses",   icon: "currency"   },
    { href: "/administrator/tickets",  label: "Ticket Inbox",  icon: "inbox"      },
    { href: "/administrator/offices",  label: "Offices",       icon: "building"   },
  ],
  director: [
    { href: "/director",                    label: "Dashboard",         icon: "home"        },
    { href: "/director/projects",           label: "Projects",          icon: "folder"      },
    { href: "/director/hearings",           label: "Hearings",          icon: "calendar"    },
    { href: "/director/calendar",           label: "Team Calendar",     icon: "users-team"  },
    { href: "/director/cases",              label: "Cases",             icon: "scale"       },
    { href: "/director/users",              label: "Users",             icon: "users"       },
    { href: "/director/grievances",         label: "Grievances",        icon: "inbox"       },
    { href: "/director/assign",             label: "Assign",            icon: "refresh"     },
    { href: "/director/head-lawyers",       label: "Head Lawyers",      icon: "award"       },
    { href: "/director/jan-sahayak-pro",    label: "JNA Pro",           icon: "gavel"       },
    { href: "/director/event-pipeline",     label: "Event Pipeline",    icon: "trending-up" },
    { href: "/director/invoices",           label: "Invoice Approvals", icon: "receipt"     },
    { href: "/director/expense-approvals",  label: "Expense Approvals", icon: "currency"    },
  ],
  superadmin: [
    { href: "/superadmin",            label: "Overview",       icon: "compass"     },
    { href: "/superadmin/projects",   label: "Projects",       icon: "folder"      },
    { href: "/director/calendar",     label: "Team Calendar",  icon: "users-team"  },
    { href: "/director/users",        label: "Users",          icon: "users"       },
    { href: "/director/cases",        label: "All Cases",      icon: "scale"       },
    { href: "/director",              label: "Director",       icon: "settings"    },
    { href: "/hr",                    label: "HR",             icon: "user-plus"   },
    { href: "/litigation",            label: "Litigation",     icon: "gavel"       },
    { href: "/socialworker",          label: "Social Worker",  icon: "user-circle" },
    { href: "/finance",               label: "Finance",        icon: "trending-up" },
    { href: "/administrator",         label: "Administrator",  icon: "building"    },
  ],
};

/** Cross-role utility items shown to every staff role. */
const STAFF_ITEMS: NavItem[] = [
  { href: "/activities", label: "Activities", icon: "target"  },
];

/** Logistics is an admin-only function — fulfilling tickets, raising office
 *  spend, etc. Only roles who actually act on logistics requests should see
 *  the link. Field staff (socialworker / litigation / hr / finance) raise
 *  tickets via /grievance or in-page widgets, not through a top-level
 *  "Logistics" sidebar entry. */
const LOGISTICS_ROLES = ["administrator", "director", "superadmin"];
const LOGISTICS_ITEM: NavItem = { href: "/logistics", label: "Logistics", icon: "briefcase" };

/** Build the full sidebar for a given role.
 *  Dashboard always pinned to top; everything else sorted alphabetically by
 *  label. The profile is reached from the user's name in the sidebar footer
 *  (standard practice), so it's no longer a separate nav item. */
export function navItemsFor(role: string): NavItem[] {
  const base = ROLE_ITEMS[role] ?? [];
  // Activities is staff-only (community gated out). Logistics is gated to
  // the roles who fulfil tickets — administrator / director / superadmin —
  // so the link doesn't sit in every staff sidebar by default.
  const utility: NavItem[] = role === "community"
    ? []
    : LOGISTICS_ROLES.includes(role)
      ? [...STAFF_ITEMS, LOGISTICS_ITEM]
      : STAFF_ITEMS;

  // Per-role pruning of the SHARED_ITEMS strip:
  //  - community has /community/appointments (DB-only freebusy flow) +
  //    /community/case-tracker bundled as "Cases & Appointments" in the
  //    role strip, and Speak to Us / SOS / Chat bundled as "Help &
  //    Support". So /appointments, /chat, and /policies are all dropped
  //    from the shared strip to avoid duplication.
  //  - finance never sees /training (legacy decision).
  let shared: NavItem[];
  if (role === "community") {
    shared = SHARED_ITEMS.filter(i => i.href !== "/appointments" && i.href !== "/policies" && i.href !== "/chat");
  } else if (role === "finance") {
    shared = SHARED_ITEMS.filter(i => i.href !== "/training");
  } else {
    shared = SHARED_ITEMS;
  }

  const all = [...base, ...utility, ...shared];
  const dashboardItem = all.find((i) => i.label === "Dashboard" || i.label === "Overview");
  const rest = all
    .filter((i) => i !== dashboardItem)
    .sort((a, b) => a.label.localeCompare(b.label));

  return [
    ...(dashboardItem ? [dashboardItem] : []),
    ...rest,
  ];
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
