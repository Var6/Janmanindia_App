import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import Case from "@/models/Case";
import User from "@/models/User";
import { updateCalendarEvent, deleteCalendarEvent } from "@/lib/gcal";

type Params = { params: Promise<{ caseId: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { caseId } = await params;
    await connectDB();

    const caseDoc = await Case.findById(caseId)
      .populate("community", "name email phone")
      .populate("litigationMember", "name email")
      .populate("litigationMembers", "name email")
      .populate("socialWorker", "name email")
      .populate("auditLog.by", "name role")
      .lean();

    if (!caseDoc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Access control. Litigation can read when they're the lead OR one of
    // the shared members — supports the multi-lawyer share flow.
    const communityId = String(caseDoc.community?._id ?? caseDoc.community);
    const lmId = String(caseDoc.litigationMember?._id ?? caseDoc.litigationMember ?? "");
    const swId = String(caseDoc.socialWorker?._id ?? caseDoc.socialWorker ?? "");
    const sharedIds = (caseDoc.litigationMembers ?? []).map((m: unknown) => {
      const mm = m as { _id?: unknown } | string;
      return typeof mm === "string" ? mm : String((mm as { _id?: unknown })._id ?? mm);
    });
    const isAssignedLitigation = session.role === "litigation"
      && (lmId === session.id || sharedIds.includes(session.id));

    const allowed =
      session.role === "superadmin" ||
      session.role === "director" ||
      (session.role === "community" && communityId === session.id) ||
      isAssignedLitigation ||
      (session.role === "socialworker" && swId === session.id);

    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    return NextResponse.json({ case: caseDoc });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("GET /api/cases/[caseId] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    if (!["litigation", "director", "superadmin"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { caseId } = await params;
    await connectDB();

    const caseDoc = await Case.findById(caseId);
    if (!caseDoc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Litigation can write when they're the lead OR a shared member. Other
    // privileged roles (director / superadmin) skip this check.
    if (session.role === "litigation") {
      const lead = String(caseDoc.litigationMember ?? "");
      const sharedIdsW = (caseDoc.litigationMembers ?? []).map(String);
      if (lead !== session.id && !sharedIdsW.includes(session.id)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const body = await request.json();
    const allowedFields = [
      "status", "nextHearingDate", "caseTitle", "criminalPath", "highCourtPath",
      "district", "causeTitle",
      // District Legal Fellow Case Management form — lawyer-managed metadata.
      "courtCaseNumber", "courtName", "relevantSections",
      "bailAndAppearanceStatus", "stage", "compensationStatus",
      // Court-type-aware create-form fields, editable from case detail too.
      "courtType", "state", "parties", "subject", "eCourtLink",
      "filingStatus", "reportingStatus",
    ];
    const update: Record<string, unknown> = {};
    const pushOps: Record<string, unknown> = {};
    /** Audit entries collected during this PATCH. Pushed onto auditLog once
     *  at the end so they all share the same Mongo round-trip. */
    const audit: { action: string; summary: string; by: string; byRole: string; at: Date }[] = [];
    const logAudit = (action: string, summary: string) => {
      audit.push({ action, summary, by: session.id, byRole: session.role, at: new Date() });
    };

    for (const field of allowedFields) {
      if (body[field] !== undefined) update[field] = body[field];
    }

    // Audit only fields the user explicitly changed AND whose new value
    // differs from what's currently stored. Pure no-ops (re-saving the same
    // status, etc.) shouldn't pollute the timeline.
    if (body.status !== undefined && body.status !== caseDoc.status) {
      logAudit("status_changed", `Status: ${caseDoc.status} → ${body.status}`);
    }
    if (body.nextHearingDate !== undefined) {
      const incoming = body.nextHearingDate ? new Date(body.nextHearingDate).toISOString() : null;
      const current  = caseDoc.nextHearingDate ? new Date(caseDoc.nextHearingDate).toISOString() : null;
      if (incoming !== current) {
        const fmt = (d: string | null) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
        logAudit("hearing_updated", `Next hearing: ${fmt(current)} → ${fmt(incoming)}`);
      }
    }
    // Generic metadata field changes — log each one with field name. Skip
    // criminalPath / highCourtPath here because they're handled by the
    // stage-transition + doc-upload branches below with richer summaries.
    const META_FIELDS = ["caseTitle", "district", "causeTitle", "courtCaseNumber", "courtName", "relevantSections", "bailAndAppearanceStatus", "stage", "compensationStatus"];
    for (const f of META_FIELDS) {
      if (body[f] !== undefined && body[f] !== (caseDoc as unknown as Record<string, unknown>)[f]) {
        logAudit("metadata_updated", `Updated ${f}`);
      }
    }

    if (body.diaryEntry) {
      pushOps.caseDiary = {
        date: new Date(body.diaryEntry.date),
        findings: body.diaryEntry.findings,
        writtenBy: session.id,
      };
      delete update.diaryEntry;
      logAudit("diary_added", "Added a diary entry");
    }

    /* Share / unshare the case with another litigation member. The lead
       lawyer (`litigationMember`) is left alone — share only mutates
       `litigationMembers[]`. Director / superadmin can always share; a
       litigation member can only share a case they're already on. */
    if (body.shareWithLitigation) {
      const userId = String(body.shareWithLitigation.userId ?? "").trim();
      if (!userId) {
        return NextResponse.json({ error: "shareWithLitigation.userId is required" }, { status: 400 });
      }
      const target = await User.findById(userId).select("role isActive name").lean();
      if (!target || !target.isActive || target.role !== "litigation") {
        return NextResponse.json({ error: "Target user must be an active litigation member" }, { status: 400 });
      }
      const existing = (caseDoc.litigationMembers ?? []).map(String);
      if (!existing.includes(userId) && String(caseDoc.litigationMember ?? "") !== userId) {
        await Case.updateOne({ _id: caseId }, { $addToSet: { litigationMembers: userId } });
        logAudit("case_shared", `Shared with ${target.name}`);
      }
    }
    if (body.unshareLitigation) {
      const userId = String(body.unshareLitigation.userId ?? "").trim();
      if (!userId) {
        return NextResponse.json({ error: "unshareLitigation.userId is required" }, { status: 400 });
      }
      // The lead lawyer is never removed via this op — keeps invariant
      // "the case always has at least one owner."
      if (String(caseDoc.litigationMember ?? "") === userId) {
        return NextResponse.json({ error: "Cannot remove the lead litigation member; reassign first" }, { status: 400 });
      }
      const target = await User.findById(userId).select("name").lean();
      await Case.updateOne({ _id: caseId }, { $pull: { litigationMembers: userId } });
      logAudit("case_unshared", `Removed ${target?.name ?? "lawyer"}`);
    }

    /* List of Dates entry — append a chronological note to the HC matter's
       timeline. Each entry is a date + label (+ optional doc). Editors:
       litigation members on the case (already gated above). */
    if (body.addListOfDatesEntry) {
      const e = body.addListOfDatesEntry as { date?: string; label?: string; docUrl?: string; docLabel?: string };
      if (!e.date || !e.label?.trim()) {
        return NextResponse.json({ error: "addListOfDatesEntry.date and .label are required" }, { status: 400 });
      }
      const dt = new Date(e.date);
      if (isNaN(dt.getTime())) {
        return NextResponse.json({ error: "addListOfDatesEntry.date is invalid" }, { status: 400 });
      }
      pushOps["highCourtPath.listOfDates"] = {
        date: dt,
        label: e.label.trim(),
        addedBy: session.id,
        addedAt: new Date(),
        ...(e.docUrl ? { doc: {
          label: e.docLabel?.trim() || e.label.trim(),
          url: e.docUrl,
          uploadedBy: session.id,
          uploadedAt: new Date(),
          ocrStatus: "pending" as const,
        }} : {}),
      };
      logAudit("list_of_dates_added", `List of dates: ${e.label.trim()}`);
    }

    /* Court Appearance entry — mirrors the Janman District Legal Fellowship
       Court Appearance Google Form. Push the structured record onto
       courtAppearances and also bump the top-level nextHearingDate so the
       existing hearing widgets/calendar sync continue to work. */
    if (body.courtAppearance) {
      const ca = body.courtAppearance as {
        date?: string;
        currentStatus?: string;
        dailyOrderBrief?: string;
        lastHearingDate?: string;
        nextHearingDate?: string;
        remarks?: string;
      };
      if (!ca.date || !ca.dailyOrderBrief?.trim()) {
        return NextResponse.json(
          { error: "courtAppearance.date and courtAppearance.dailyOrderBrief are required" },
          { status: 400 }
        );
      }
      const apDate = new Date(ca.date);
      if (isNaN(apDate.getTime())) {
        return NextResponse.json({ error: "courtAppearance.date is invalid" }, { status: 400 });
      }
      const lastHearingDate = ca.lastHearingDate ? new Date(ca.lastHearingDate) : undefined;
      const nextHearingDate = ca.nextHearingDate ? new Date(ca.nextHearingDate) : undefined;
      pushOps.courtAppearances = {
        date: apDate,
        currentStatus: ca.currentStatus?.trim() || undefined,
        dailyOrderBrief: ca.dailyOrderBrief.trim(),
        lastHearingDate: lastHearingDate && !isNaN(lastHearingDate.getTime()) ? lastHearingDate : undefined,
        nextHearingDate: nextHearingDate && !isNaN(nextHearingDate.getTime()) ? nextHearingDate : undefined,
        remarks: ca.remarks?.trim() || undefined,
        loggedBy: session.id,
        loggedAt: new Date(),
      };
      logAudit(
        "appearance_logged",
        `Court appearance logged for ${apDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}${ca.currentStatus ? ` — ${ca.currentStatus}` : ""}`
      );
      // If the appearance carries a future hearing, surface it on the case so
      // the dashboard widget + calendar sync (handled below) pick it up.
      if (nextHearingDate && !isNaN(nextHearingDate.getTime())) {
        update.nextHearingDate = nextHearingDate;
        body.nextHearingDate = nextHearingDate.toISOString();
      }
    }

    /* Stage transition — advance / revert one workflow step without uploading
     * a doc. Used by the Case Stage Stepper UI on the case detail page so a
     * lawyer can mark a stage done (or undo a click) with one button.
     *
     *   body.stageTransition = { stage: "fir" | "chargesheet" | ... , action: "advance" | "revert" }
     *
     * Criminal stages (in order):  fir → chargesheet → charges → verdict
     * High court stages:           petitionFiled → supportingAffidavit → admission
     *                              → counterAffidavit → rejoinder → pleaClose → inducement
     *
     * "advance" sets the boolean true and stamps the date with `now`.
     * "revert" sets the boolean false and clears the date. Document
     * artefacts (firDoc, chargeDocs, etc.) are left intact — a stage can be
     * un-marked without losing the uploaded evidence.
     */
    if (body.stageTransition) {
      const { stage, action } = body.stageTransition as { stage?: string; action?: string };
      if (!stage || (action !== "advance" && action !== "revert")) {
        return NextResponse.json({ error: "stageTransition requires stage + action ('advance' | 'revert')" }, { status: 400 });
      }
      const advance = action === "advance";
      const now = new Date();
      // Pretty stage labels for the audit summary — keep in sync with the
      // stepper labels so users see consistent wording across UIs.
      const STAGE_LABELS: Record<string, string> = {
        fir: "FIR Filed", chargesheet: "Chargesheet Filed", charges: "Charges Framed", verdict: "Verdict",
        petitionFiled: "Petition Filed", supportingAffidavit: "Supporting Affidavit", admission: "Admission",
        counterAffidavit: "Counter Affidavit", rejoinder: "Rejoinder", pleaClose: "Plea Close", inducement: "Inducement",
      };
      const stageLabel = STAGE_LABELS[stage] ?? stage;
      logAudit(
        advance ? "stage_advance" : "stage_revert",
        advance ? `Marked ${stageLabel} done` : `Reverted ${stageLabel}`
      );

      if (caseDoc.path === "criminal") {
        const CRIMINAL = ["fir", "chargesheet", "charges", "verdict"];
        if (!CRIMINAL.includes(stage)) {
          return NextResponse.json({ error: `Unknown criminal stage "${stage}"` }, { status: 400 });
        }
        if (stage === "fir") {
          update["criminalPath.firFiled"] = advance;
        } else if (stage === "chargesheet") {
          update["criminalPath.chargesheetFiled"] = advance;
          update["criminalPath.chargesheetDate"] = advance ? now : null;
        } else if (stage === "charges") {
          update["criminalPath.chargesFramed"] = advance;
        } else if (stage === "verdict") {
          // Verdict text is set via a different path; here we just mark the
          // verdict date so the stepper can surface "verdict reached" without
          // forcing a free-text prompt mid-click.
          update["criminalPath.verdictDate"] = advance ? now : null;
        }
      } else if (caseDoc.path === "highcourt") {
        const HC_STAGES = [
          // Granular 7-step flow.
          "petitionFiled", "supportingAffidavit", "admission",
          "counterAffidavit", "rejoinder", "pleaClose", "inducement",
          // High-level 4-stage tracker (additive — see Case model).
          "officeNotes", "argumentsStage", "judgements",
        ];
        if (!HC_STAGES.includes(stage)) {
          return NextResponse.json({ error: `Unknown high-court stage "${stage}"` }, { status: 400 });
        }
        update[`highCourtPath.${stage}.filed`]   = advance;
        update[`highCourtPath.${stage}.filedAt`] = advance ? now : null;
      }
    }

    // Document upload routed by category. Empty/general → documents[];
    // criminal-path categories → relevant criminal sub-doc; high-court step
    // names → highCourtPath.<step>.{filed, filedAt, doc}.
    if (body.addDocument) {
      const { label, url, category } = body.addDocument as { label: string; url: string; category?: string };
      if (!label || !url) {
        return NextResponse.json({ error: "addDocument.label and addDocument.url are required" }, { status: 400 });
      }
      const docPayload = {
        label,
        url,
        uploadedBy: session.id,
        uploadedAt: new Date(),
        ocrStatus: "pending" as const,
      };
      const cat = (category ?? "general").toLowerCase();
      logAudit("doc_uploaded", `Uploaded "${label}"${cat && cat !== "general" ? ` (${cat})` : ""}`);
      if (cat === "general" || !cat) {
        pushOps.documents = docPayload;
      } else if (cat === "fir") {
        update["criminalPath.firFiled"] = true;
        update["criminalPath.firDoc"] = docPayload;
      } else if (cat === "charge") {
        update["criminalPath.chargesFramed"] = true;
        pushOps["criminalPath.chargeDocs"] = docPayload;
      } else if (cat === "cognizance") {
        update["criminalPath.cognizanceOrderDoc"] = docPayload;
      } else if (cat === "evidence") {
        pushOps["criminalPath.trial.evidenceDocs"] = docPayload;
      } else if (cat === "forensic") {
        pushOps["criminalPath.trial.forensicDocs"] = docPayload;
      } else if (["petitionfiled", "supportingaffidavit", "admission", "counteraffidavit", "rejoinder", "pleaclose", "inducement"].includes(cat)) {
        const stepKey = cat === "petitionfiled"        ? "petitionFiled"
                      : cat === "supportingaffidavit"  ? "supportingAffidavit"
                      : cat === "counteraffidavit"     ? "counterAffidavit"
                      : cat === "pleaclose"            ? "pleaClose"
                      : cat;
        update[`highCourtPath.${stepKey}.filed`]   = true;
        update[`highCourtPath.${stepKey}.filedAt`] = new Date();
        update[`highCourtPath.${stepKey}.doc`]     = docPayload;
      }
      // Named HC document slots (Phase B). Singular slots overwrite; plural
      // slots ($push). Each slot also auto-flips the corresponding 4-stage
      // marker where it makes sense — e.g. uploading the main petition
      // implies "Office Notes" reached; an order doc implies "Judgements".
      else if (cat === "mainpetition" || cat === "main-petition") {
        update["highCourtPath.mainPetitionDoc"] = docPayload;
        update["highCourtPath.officeNotes.filed"]   = true;
        update["highCourtPath.officeNotes.filedAt"] = new Date();
      } else if (cat === "counter-affidavit" || cat === "counteraffidavits") {
        pushOps["highCourtPath.counterAffidavitDocs"] = docPayload;
      } else if (cat === "rejoinders") {
        pushOps["highCourtPath.rejoinderDocs"] = docPayload;
      } else if (cat === "notes-of-arguments" || cat === "notesofarguments") {
        update["highCourtPath.notesOfArgumentsDoc"] = docPayload;
        update["highCourtPath.argumentsStage.filed"]   = true;
        update["highCourtPath.argumentsStage.filedAt"] = new Date();
      } else if (cat === "order" || cat === "orders") {
        pushOps["highCourtPath.orderDocs"] = docPayload;
        update["highCourtPath.judgements.filed"]   = true;
        update["highCourtPath.judgements.filedAt"] = new Date();
      } else {
        pushOps.documents = docPayload;
      }
    }

    // Flush audit entries collected during this PATCH onto the auditLog
     // array. Using `$each` keeps insertion order even when multiple entries
     // came from a single request (e.g. doc upload that also advances a
     // stage).
    if (audit.length > 0) {
      pushOps.auditLog = audit.length === 1 ? audit[0] : { $each: audit };
    }
    if (Object.keys(pushOps).length > 0) update["$push"] = pushOps;

    const updated = await Case.findByIdAndUpdate(caseId, update, { new: true });

    // Sync Google Calendar on nextHearingDate change
    if (body.nextHearingDate && updated) {
      try {
        const lmUser = await User.findById(updated.litigationMember).lean();
        const communityUser = await User.findById(updated.community).lean();
        const swUser = updated.socialWorker
          ? await User.findById(updated.socialWorker).lean()
          : null;

        const attendees = [lmUser?.email, communityUser?.email, swUser?.email].filter(
          Boolean
        ) as string[];

        const hearingDate = new Date(body.nextHearingDate);

        if (updated.googleCalendarEventId) {
          await updateCalendarEvent(updated.googleCalendarEventId, {
            startDateTime: hearingDate,
            attendeeEmails: attendees,
          });
        }
      } catch (calErr) {
        console.error("Calendar sync error:", calErr);
      }
    }

    // Delete calendar event on case close/dismiss
    if ((body.status === "Closed" || body.status === "Dismissed") && caseDoc.googleCalendarEventId) {
      try {
        await deleteCalendarEvent(caseDoc.googleCalendarEventId);
        await Case.updateOne({ _id: caseId }, { $unset: { googleCalendarEventId: 1 } });
      } catch (calErr) {
        console.error("Calendar delete error:", calErr);
      }
    }

    return NextResponse.json({ case: updated });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    if (!["director", "superadmin"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { caseId } = await params;
    await connectDB();

    const caseDoc = await Case.findById(caseId);
    if (!caseDoc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (caseDoc.googleCalendarEventId) {
      try {
        await deleteCalendarEvent(caseDoc.googleCalendarEventId);
      } catch {
        // Non-fatal
      }
    }

    await Case.deleteOne({ _id: caseId });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
