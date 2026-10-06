import { NextRequest, NextResponse } from "next/server";
import { insightsRoute, readJson, str, BadRequest } from "@/lib/insights/api";
import InsightDashboard from "@/models/InsightDashboard";
import { cleanDashboardFilters, cleanTabs } from "@/lib/insights/dashboard-input";

export async function GET() {
  return insightsRoute("GET /api/insights/dashboards", async (session) => {
    const ds = await InsightDashboard.find({}).sort({ isOrgDefault: -1, updatedAt: -1 }).populate("createdBy", "name").lean();
    return NextResponse.json({
      dashboards: ds.map((d) => ({
        _id: String(d._id), title: d.title, description: d.description, isOrgDefault: d.isOrgDefault,
        pinnedByMe: (d.pinnedBy ?? []).some((u) => String(u) === session.id),
        tileCount: (d.tabs ?? []).reduce((s, t) => s + (t.tiles?.length ?? 0), 0),
        tabCount: (d.tabs ?? []).length,
        createdBy: d.createdBy, updatedAt: d.updatedAt,
      })),
    });
  });
}

export async function POST(req: NextRequest) {
  return insightsRoute("POST /api/insights/dashboards", async (session) => {
    const body = await readJson(req);
    const title = str(body.title, 140);
    if (!title) throw new BadRequest("Title is required");
    const dashboard = await InsightDashboard.create({
      title,
      description: str(body.description, 500),
      tabs: body.tabs ? cleanTabs(body.tabs) : [{ id: "overview", title: "Overview", tiles: [] }],
      filters: cleanDashboardFilters(body.filters),
      createdBy: session.id,
    });
    return NextResponse.json({ dashboard }, { status: 201 });
  });
}
