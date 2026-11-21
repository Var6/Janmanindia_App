import { NextRequest, NextResponse } from "next/server";
import { insightsRoute, readJson } from "@/lib/insights/api";
import { getCopilotSettings, saveCopilotSettings } from "@/lib/insights/settings";
import { DATASETS } from "@/lib/insights/datasets";
import { connectorStatus } from "@/lib/insights/connectors";
import { mailEnabled } from "@/lib/mailer";
import { filesPrivate, r2Ready } from "@/lib/storage";
import InsightKpi from "@/models/InsightKpi";

/**
 * GET — everything the Settings page shows: the Copilot controls, and which
 * outside services are connected. Only names of missing settings are sent,
 * never a key, password or token.
 */
export async function GET() {
  return insightsRoute("GET /api/insights/settings", async () => {
    const copilot = await getCopilotSettings();
    const unconfirmedTargets = await InsightKpi.countDocuments({ targetConfirmed: false });
    return NextResponse.json({
      copilot,
      copilotEnv: {
        hasKey: !!process.env.ANTHROPIC_API_KEY,
        forcedOff: process.env.INSIGHTS_COPILOT === "off",
        model: process.env.INSIGHTS_COPILOT_MODEL ?? "claude-sonnet-4-5",
      },
      datasets: DATASETS.map((d) => ({ key: d.key, label: d.label, description: d.description })),
      email: { enabled: mailEnabled(), from: mailEnabled() ? process.env.MAIL_FROM : undefined },
      connectors: connectorStatus().map(({ key, label, configured, missing }) => ({ key, label, configured, missing })),
      files: { storage: r2Ready() ? "r2" : "local", private: filesPrivate() },
      cron: { hasSecret: !!process.env.CRON_SECRET },
      unconfirmedTargets,
    });
  });
}

/** PUT { copilot: { enabled?, requireApproval?, context?, datasets? } } */
export async function PUT(req: NextRequest) {
  return insightsRoute("PUT /api/insights/settings", async (session) => {
    const body = await readJson(req);
    const copilot = await saveCopilotSettings((body.copilot ?? {}) as Record<string, unknown>, { id: session.id, name: session.name });
    return NextResponse.json({ copilot });
  });
}
