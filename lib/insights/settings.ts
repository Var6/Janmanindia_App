import InsightSettings from "@/models/InsightSettings";
import { DATASETS } from "@/lib/insights/datasets";
import { BadRequest } from "@/lib/insights/api";

export type CopilotSettings = {
  enabled: boolean;
  requireApproval: boolean;
  context: string;
  datasets: string[];
  changedByName?: string;
  changedAt?: string;
};

/**
 * The saved Copilot settings. Until a director has saved the Settings page
 * once, Copilot follows the INSIGHTS_COPILOT environment switch (on / unset),
 * with approval of each query required.
 */
export async function getCopilotSettings(): Promise<CopilotSettings> {
  const doc = await InsightSettings.findOne({ key: "org" }).lean();
  if (!doc) return { enabled: process.env.INSIGHTS_COPILOT === "on", requireApproval: true, context: "", datasets: [] };
  const c = doc.copilot ?? ({} as NonNullable<typeof doc.copilot>);
  return {
    enabled: !!c.enabled,
    requireApproval: c.requireApproval !== false,
    context: c.context ?? "",
    datasets: (c.datasets ?? []).filter((k) => DATASETS.some((d) => d.key === k)),
    changedByName: c.changedByName,
    changedAt: c.changedAt ? new Date(c.changedAt).toISOString() : undefined,
  };
}

export async function saveCopilotSettings(body: Record<string, unknown>, by: { id: string; name: string }): Promise<CopilotSettings> {
  const current = await getCopilotSettings();
  const next = { ...current };
  if (body.enabled !== undefined) next.enabled = body.enabled === true;
  if (body.requireApproval !== undefined) next.requireApproval = body.requireApproval !== false;
  if (body.context !== undefined) {
    if (typeof body.context !== "string") throw new BadRequest("Context must be text");
    if (body.context.length > 5000) throw new BadRequest("Context can be up to 5,000 characters");
    next.context = body.context.trim();
  }
  if (body.datasets !== undefined) {
    if (!Array.isArray(body.datasets)) throw new BadRequest("datasets must be a list");
    const keys = [...new Set(body.datasets.map(String))].filter((k) => DATASETS.some((d) => d.key === k));
    // "All of them" is stored as an empty list, so a dataset added to the app
    // later is included without anyone having to come back here.
    next.datasets = keys.length === DATASETS.length ? [] : keys;
    if (Array.isArray(body.datasets) && body.datasets.length > 0 && keys.length === 0) throw new BadRequest("Choose at least one dataset");
  }
  await InsightSettings.updateOne(
    { key: "org" },
    {
      $set: {
        "copilot.enabled": next.enabled, "copilot.requireApproval": next.requireApproval, "copilot.context": next.context,
        "copilot.datasets": next.datasets, "copilot.changedBy": by.id, "copilot.changedByName": by.name, "copilot.changedAt": new Date(),
      },
    },
    { upsert: true },
  );
  return getCopilotSettings();
}
