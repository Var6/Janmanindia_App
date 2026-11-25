import { NextRequest, NextResponse } from "next/server";
import { insightsRoute, BadRequest } from "@/lib/insights/api";
import { fieldValues } from "@/lib/insights/query";

/** GET /api/insights/datasets/values?dataset=cases&field=district — values
 *  present in the data, for filter pick-lists. */
export async function GET(req: NextRequest) {
  return insightsRoute("GET /api/insights/datasets/values", async () => {
    const dataset = req.nextUrl.searchParams.get("dataset");
    const field = req.nextUrl.searchParams.get("field");
    if (!dataset || !field) throw new BadRequest("dataset and field are required");
    return NextResponse.json({ values: await fieldValues(dataset, field) });
  });
}
