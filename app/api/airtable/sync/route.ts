import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongoose";
import { requireRole } from "@/lib/auth";
import Activity from "@/models/Activity";
import LogisticsTicket from "@/models/LogisticsTicket";
import Grievance from "@/models/Grievance";
import { isAirtableConfigured, pushRecords } from "@/lib/airtable";

interface PopulatedRef { _id: unknown; name?: string; role?: string }

/** POST /api/airtable/sync — pushes the last 7 days of activities, tickets, and
 *  grievances to the configured Airtable base. Director / superadmin only. */
export async function POST() {
  try {
    await requireRole("director", "superadmin");
    if (!isAirtableConfigured()) {
      return NextResponse.json({
        error: "Airtable not configured. Set AIRTABLE_API_KEY and AIRTABLE_BASE_ID in .env.local.",
      }, { status: 412 });
    }

    await connectDB();
    const since = new Date(Date.now() - 7 * 86400000);

    const [activities, tickets, grievances] = await Promise.all([
      Activity.find({ updatedAt: { $gte: since } })
        .populate("assignee",  "name role")
        .populate("createdBy", "name role")
        .lean(),
      LogisticsTicket.find({ updatedAt: { $gte: since } })
        .populate("raisedBy",   "name role")
        .populate("assignedTo", "name role")
        .lean(),
      Grievance.find({ updatedAt: { $gte: since } })
        .populate("submittedBy", "name role")
        .populate("respondedBy", "name role")
        .lean(),
    ]);

    const aRows = activities.map((a) => {
      const ass = a.assignee  as unknown as PopulatedRef | null;
      const cre = a.createdBy as unknown as PopulatedRef | null;
      return {
        ID: String(a._id),
        Title: a.title,
        Description: a.description ?? "",
        Category: a.category,
        Priority: a.priority,
        Status: a.status,
        Assignee: ass?.name ?? "",
        "Assignee Role": ass?.role ?? "",
        "Created By": cre?.name ?? "",
        "Due Date": a.dueDate ? new Date(a.dueDate).toISOString().slice(0, 10) : "",
        "Updated At": new Date(a.updatedAt).toISOString(),
      };
    });

    const tRows = tickets.map((t) => {
      const rb = t.raisedBy   as unknown as PopulatedRef | null;
      const at = t.assignedTo as unknown as PopulatedRef | null;
      return {
        ID: String(t._id),
        Title: t.title,
        Description: t.description,
        Category: t.category,
        Urgency: t.urgency,
        Status: t.status,
        District: t.district ?? "",
        Beneficiary: t.beneficiary ?? "",
        "Raised By": rb?.name ?? "",
        "Assigned To": at?.name ?? "",
        Response: t.response ?? "",
        "Updated At": new Date(t.updatedAt).toISOString(),
      };
    });

    const gRows = grievances.map((g) => {
      const sb = g.submittedBy as unknown as PopulatedRef | null;
      return {
        ID: String(g._id),
        Subject: g.subject,
        Category: g.category,
        Status: g.status,
        Anonymous: !!g.anonymous,
        "Submitted By": g.anonymous ? "(anonymous)" : sb?.name ?? "",
        Description: g.description,
        "HR Response": g.hrResponse ?? "",
        "Updated At": new Date(g.updatedAt).toISOString(),
      };
    });

    const [ac, tc, gc] = await Promise.all([
      pushRecords("activities", aRows),
      pushRecords("tickets",    tRows),
      pushRecords("grievances", gRows),
    ]);

    return NextResponse.json({
      pushed: { activities: ac, tickets: tc, grievances: gc },
      attempted: { activities: aRows.length, tickets: tRows.length, grievances: gRows.length },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("airtable sync error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
