import { NextRequest, NextResponse } from "next/server";
import { insightsRoute, readJson, str, BadRequest } from "@/lib/insights/api";
import InsightImport from "@/models/InsightImport";
import { describeColumns } from "@/lib/insights/csv";
import { chooseColumns, loadTable, replaceRows } from "@/lib/insights/imports";
import { connectorStatus } from "@/lib/insights/connectors";

export const maxDuration = 60;

/** GET — imported datasets, plus the sources on offer and whether each is
 *  set up (names of missing settings only, never values). */
export async function GET() {
  return insightsRoute("GET /api/insights/imports", async () => {
    const imports = await InsightImport.find({}).sort({ createdAt: -1 }).populate("createdBy", "name").lean();
    return NextResponse.json({ imports, connectors: connectorStatus() });
  });
}

/** POST { name, description?, source, ref?, csv?, syncSchedule?, columns: [{source, type, label}] } */
export async function POST(req: NextRequest) {
  return insightsRoute("POST /api/insights/imports", async (session) => {
    const body = await readJson(req);
    const name = str(body.name, 120);
    if (!name) throw new BadRequest("Give the dataset a name");
    const source = String(body.source ?? "");
    const ref = source === "csv" ? undefined : str(body.ref, 500);
    const table = await loadTable(source, ref, body.csv);
    const columns = chooseColumns(describeColumns(table.headers, table.rows), body.columns);
    const imp = await InsightImport.create({
      name, description: str(body.description, 500), source, sourceRef: ref,
      columns: columns.map(({ key, label, type }) => ({ key, label, type })),
      syncSchedule: source !== "csv" && (body.syncSchedule === "daily" || body.syncSchedule === "weekly") ? body.syncSchedule : "none",
      createdBy: session.id,
    });
    const rows = await replaceRows(String(imp._id), columns, table);
    return NextResponse.json({ import: { _id: String(imp._id), rows } }, { status: 201 });
  });
}
