import { NextResponse } from "next/server";
import { insightsRoute } from "@/lib/insights/api";
import { listDatasets } from "@/lib/insights/query";
import { publicDataset } from "@/lib/insights/datasets";

/** GET /api/insights/datasets — every queryable dataset and its fields. */
export async function GET() {
  return insightsRoute("GET /api/insights/datasets", async () => {
    const all = await listDatasets();
    return NextResponse.json({ datasets: all.map(publicDataset) });
  });
}
