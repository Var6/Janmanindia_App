import { NextRequest, NextResponse } from "next/server";
import { insightsRoute, oid, notFound, BadRequest } from "@/lib/insights/api";
import InsightImport from "@/models/InsightImport";
import { describeColumns } from "@/lib/insights/csv";
import { loadTable, replaceRows } from "@/lib/insights/imports";

type Ctx = { params: Promise<{ id: string }> };

/** POST — re-read a Google Sheet or Kobo form and replace the rows. Columns
 *  are matched by their key; new columns in the source are ignored. */
export async function POST(_req: NextRequest, ctx: Ctx) {
  return insightsRoute("POST /api/insights/imports/[id]/sync", async () => {
    const imp = await InsightImport.findById(oid((await ctx.params).id)).lean();
    if (!imp) return notFound();
    if (imp.source === "csv") throw new BadRequest("A CSV upload cannot be refreshed; upload the new file as a new dataset");
    const table = await loadTable(imp.source, imp.sourceRef, undefined);
    const fresh = describeColumns(table.headers, table.rows);
    const columns = imp.columns
      .map((c) => {
        const f = fresh.find((x) => x.key === c.key);
        return f ? { ...f, type: c.type, label: c.label } : null;
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);
    if (!columns.length) throw new BadRequest("None of this dataset's columns are in the source any more");
    const rows = await replaceRows(String(imp._id), columns, table);
    return NextResponse.json({ ok: true, rows, missingColumns: imp.columns.length - columns.length });
  });
}
