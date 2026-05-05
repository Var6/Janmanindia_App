import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import Case from "@/models/Case";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const path = searchParams.get("path");
    const q = searchParams.get("q")?.trim();
    const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 100);
    const skip = Number(searchParams.get("skip") ?? "0");

    // Visibility rules — only director / administrator / superadmin see
    // every case. Litigation and social workers see only what they're
    // assigned to. Community sees their own. Anyone else (hr, finance)
    // gets nothing.
    const filter: Record<string, unknown> = {};
    const ALL_ACCESS = ["director", "administrator", "superadmin"];

    if (ALL_ACCESS.includes(session.role)) {
      // No additional filter — every case is visible.
    } else if (session.role === "community") {
      filter.community = session.id;
    } else if (session.role === "litigation") {
      // Strictly assigned cases. A case is visible if the lawyer is the
      // lead (`litigationMember`, legacy single-lawyer rows) OR is one of
      // the shared `litigationMembers[]` (new multi-lawyer rows). A lawyer
      // should never see a case they aren't on the record for.
      filter.$or = [
        { litigationMember: session.id },
        { litigationMembers: session.id },
      ];
    } else if (session.role === "socialworker") {
      filter.socialWorker = session.id;
    } else {
      // HR / finance / anyone else: never list cases. An impossible
      // condition keeps the rest of the pagination + search code working
      // uniformly without an early-return branch.
      filter._id = null;
    }

    if (status) filter.status = status;
    if (path) filter.path = path;

    // Free-text search across caseNumber + caseTitle for typeahead pickers.
    // If the role visibility filter already used `$or` (litigation), combine
    // the two sets via `$and` so we don't lose either constraint.
    if (q && q.length >= 1) {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(escaped, "i");
      const searchOr = [{ caseNumber: re }, { caseTitle: re }, { courtCaseNumber: re }];
      if (Array.isArray(filter.$or)) {
        const visibilityOr = filter.$or as Record<string, unknown>[];
        delete filter.$or;
        filter.$and = [{ $or: visibilityOr }, { $or: searchOr }];
      } else {
        filter.$or = searchOr;
      }
    }

    const [cases, total] = await Promise.all([
      Case.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("community", "name email")
        .populate("litigationMember", "name")
        .populate("litigationMembers", "name email")
        .populate("socialWorker", "name")
        .lean(),
      Case.countDocuments(filter),
    ]);

    return NextResponse.json({ cases, total, limit, skip });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("GET /api/cases error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();

    // Janman's HR / litigation / director leads are all qualified lawyers,
    // so any signed-in role may file or register a case. Community members
    // file under their own name; staff file on behalf of community members.

    await connectDB();

    const body = await request.json();
    const { caseTitle, path: rawPath, caseType, communityId,
            status, isExistingCase, currentStep, existingNotes,
            district, causeTitle,
            courtCaseNumber, courtName, relevantSections,
            bailAndAppearanceStatus, stage, compensationStatus,
            // New court-type-aware create-form fields
            courtType: rawCourtType, state, parties, subject, eCourtLink,
            filingStatus, reportingStatus,
            litigationMemberIds,
            enquiry: enquiryRaw,
            voiceAttachment } = body as {
      caseTitle: string;
      path?: "criminal" | "highcourt";
      caseType?: string;
      communityId?: string;
      status?: "Open" | "Closed" | "Escalated" | "Pending" | "Dismissed" | "Disposal" | "Withdrawn";
      /** Set true when registering a case that's already underway elsewhere
       *  — the workflow stages all default to "not done" but the case shows
       *  with an "Existing" badge and lands in the litigation visibility
       *  queue regardless of explicit assignment. */
      isExistingCase?: boolean;
      currentStep?: string;
      existingNotes?: string;
      district?: string;
      causeTitle?: string;
      /** Lawyer-managed case-management fields (District Legal Fellow Case
       *  Management form). Usually filled in after intake by the assigned
       *  litigation member, but accepted on creation so a lawyer registering
       *  an in-progress case can populate them in one shot. */
      courtCaseNumber?: string;
      courtName?: string;
      relevantSections?: string;
      bailAndAppearanceStatus?: string;
      stage?: string;
      compensationStatus?: string;
      /** Court taxonomy (supreme / highcourt / district / other) — drives the
       *  picker on the create form. Optional so old callers keep working. */
      courtType?: "supreme" | "highcourt" | "district" | "other";
      /** Indian state the court sits in. Required for "district" type. */
      state?: string;
      /** Petitioners + respondents — captured separately so the display
       *  title (`caseTitle`) can be regenerated when parties change. */
      parties?: { petitioners?: string[]; respondents?: string[] };
      /** Strategic subject — three angles the team agrees on early. */
      subject?: { courtThey?: string; ourPoints?: string; reason?: string };
      /** External e-Courts / SC services link. */
      eCourtLink?: string;
      /** Used when the petition is being prepared / filed but doesn't yet
       *  have a court-assigned number. */
      filingStatus?: "drafting" | "filing" | "filed";
      /** Registry scrutiny outcome + defect deadline. */
      reportingStatus?: { status: "pending" | "success" | "conflict"; defectNote?: string; defectDeadline?: string };
      /** Additional litigation members to share the case with on creation.
       *  The lead lawyer is always litigationMembers[0]; this list is
       *  merged with the lead and de-duplicated server-side. */
      litigationMemberIds?: string[];
      /** Intake-time facts (Case Enquiry Form). All fields optional so the
       *  community quick-file flow continues to work; full enquiry is filled
       *  by the structured intake form. */
      enquiry?: {
        filerName?: string;
        filerPhone?: string;
        relationshipWithVictim?: string;
        victimName?: string;
        victimAddress?: string;
        victimContact?: string;
        issues?: unknown;
        accusedNames?: string;
        accusedCount?: number;
        factsOfTheCase?: string;
        firNumber?: string;
        policeStation?: string;
        placeOfOccurrence?: string;
        incidentDateTime?: string;
      };
      /** Optional voice clip (typically from the community filing form) — the
       *  uploader has already pushed the audio to storage; we just attach the
       *  resulting URL as a case document so the social worker can listen. */
      voiceAttachment?: {
        url: string;
        durationSec?: number;
        label?: string;
      };
    };

    if (!caseTitle) {
      return NextResponse.json({ error: "caseTitle is required" }, { status: 400 });
    }

    // Resolve workflow path: explicit `path` wins; otherwise derive from caseType
    let path: "criminal" | "highcourt" | undefined = rawPath;
    if (!path && caseType) {
      const { lookupCaseType } = await import("@/lib/case-types");
      path = lookupCaseType(caseType)?.path;
    }
    if (!path) {
      return NextResponse.json({ error: "Either path or a recognised caseType is required" }, { status: 400 });
    }
    if (!["criminal", "highcourt"].includes(path)) {
      return NextResponse.json({ error: "path must be criminal or highcourt" }, { status: 400 });
    }

    // Community members can only file under their own name; staff can pick
    // any community member they're authoring for.
    const communityRef = session.role === "community" ? session.id : communityId;
    if (!communityRef) {
      return NextResponse.json({ error: "communityId is required" }, { status: 400 });
    }

    const ALLOWED_STATUSES = ["Open", "Closed", "Escalated", "Pending", "Dismissed", "Disposal", "Withdrawn"] as const;
    const initialStatus = (status && (ALLOWED_STATUSES as readonly string[]).includes(status))
      ? status
      : "Pending";

    // Community-authored cases default to "existing" since the tracker UI is
    // explicitly for in-progress matters. Staff can set the flag explicitly.
    const flaggedExisting = Boolean(isExistingCase) || session.role === "community";

    // Generate unique case number
    const count = await Case.countDocuments({});
    const caseNumber = `JMI-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;

    // Whitelist enquiry input — issues go through the controlled vocabulary
    // filter, dates are parsed, and trimmed strings drop empty values so we
    // don't persist stray whitespace.
    let enquiryDoc: Record<string, unknown> | undefined;
    if (enquiryRaw && typeof enquiryRaw === "object") {
      const { filterValidIssues } = await import("@/lib/case-issues");
      const trim = (s: unknown) => (typeof s === "string" ? s.trim() : "") || undefined;
      const issues = filterValidIssues(enquiryRaw.issues);
      const incidentDateTime = enquiryRaw.incidentDateTime
        ? new Date(enquiryRaw.incidentDateTime)
        : undefined;
      const accusedCount = typeof enquiryRaw.accusedCount === "number"
        ? Math.max(0, Math.floor(enquiryRaw.accusedCount))
        : undefined;
      enquiryDoc = {
        filerName: trim(enquiryRaw.filerName),
        filerPhone: trim(enquiryRaw.filerPhone),
        relationshipWithVictim: trim(enquiryRaw.relationshipWithVictim),
        victimName: trim(enquiryRaw.victimName),
        victimAddress: trim(enquiryRaw.victimAddress),
        victimContact: trim(enquiryRaw.victimContact),
        issues: issues.length ? issues : undefined,
        accusedNames: trim(enquiryRaw.accusedNames),
        accusedCount,
        factsOfTheCase: trim(enquiryRaw.factsOfTheCase),
        firNumber: trim(enquiryRaw.firNumber),
        policeStation: trim(enquiryRaw.policeStation),
        placeOfOccurrence: trim(enquiryRaw.placeOfOccurrence),
        incidentDateTime: incidentDateTime && !isNaN(incidentDateTime.getTime()) ? incidentDateTime : undefined,
      };
      // Drop the sub-document entirely if the caller sent only blanks.
      if (!Object.values(enquiryDoc).some(v => v !== undefined)) enquiryDoc = undefined;
    }

    // Whitelist court taxonomy + reporting status. The Mongoose enum check
    // below is belt-and-braces, but rejecting upfront produces nicer errors.
    const COURT_TYPES = ["supreme", "highcourt", "district", "other"] as const;
    const courtType = (rawCourtType && (COURT_TYPES as readonly string[]).includes(rawCourtType))
      ? rawCourtType
      : undefined;

    // Build the parties + subject + reporting sub-docs only when at least
    // one field is non-empty — keeps the document tidy for fresh cases that
    // don't go through the new create-form flow.
    const cleanParties = parties && (parties.petitioners?.length || parties.respondents?.length)
      ? {
          petitioners: (parties.petitioners ?? []).map(s => String(s).trim()).filter(Boolean),
          respondents: (parties.respondents ?? []).map(s => String(s).trim()).filter(Boolean),
        }
      : undefined;
    const cleanSubject = subject && (subject.courtThey?.trim() || subject.ourPoints?.trim() || subject.reason?.trim())
      ? {
          courtThey: subject.courtThey?.trim() || undefined,
          ourPoints: subject.ourPoints?.trim() || undefined,
          reason:    subject.reason?.trim()    || undefined,
        }
      : undefined;
    let cleanReporting: { status: "pending" | "success" | "conflict"; defectNote?: string; defectDeadline?: Date } | undefined;
    if (reportingStatus?.status && ["pending", "success", "conflict"].includes(reportingStatus.status)) {
      const dl = reportingStatus.defectDeadline ? new Date(reportingStatus.defectDeadline) : undefined;
      cleanReporting = {
        status: reportingStatus.status,
        defectNote: reportingStatus.defectNote?.trim() || undefined,
        defectDeadline: dl && !isNaN(dl.getTime()) ? dl : undefined,
      };
    }

    // Resolve the litigation-member set. Lead lawyer (the session, when
    // they're filing themselves) goes at position 0; any explicitly shared
    // ids follow, with duplicates removed. Non-litigation roles (HR,
    // director, etc.) creating cases pass `litigationMemberIds` to seed the
    // assignment list without auto-becoming a member themselves.
    const litMembers: string[] = [];
    if (session.role === "litigation") litMembers.push(session.id);
    for (const id of litigationMemberIds ?? []) {
      if (typeof id === "string" && id.trim() && !litMembers.includes(id)) {
        litMembers.push(id);
      }
    }

    const newCase = await Case.create({
      caseTitle,
      caseNumber,
      path,
      caseType: caseType?.trim() || undefined,
      district: district?.trim() || undefined,
      causeTitle: causeTitle?.trim() || undefined,
      courtCaseNumber: courtCaseNumber?.trim() || undefined,
      courtName: courtName?.trim() || undefined,
      relevantSections: relevantSections?.trim() || undefined,
      bailAndAppearanceStatus: bailAndAppearanceStatus?.trim() || undefined,
      stage: stage?.trim() || undefined,
      compensationStatus: compensationStatus?.trim() || undefined,
      community: communityRef,
      // Litigation members on the case. Lead is the first id (session lawyer
      // when they file themselves, else the first explicit share). The
      // legacy single-lawyer field stays mirrored for back-compat.
      ...(litMembers.length
        ? { litigationMember: litMembers[0], litigationMembers: litMembers }
        : {}),
      // New court-type-aware fields. All optional — only persisted when set.
      ...(courtType ? { courtType } : {}),
      ...(state?.trim() ? { state: state.trim() } : {}),
      ...(cleanParties ? { parties: cleanParties } : {}),
      ...(cleanSubject ? { subject: cleanSubject } : {}),
      ...(eCourtLink?.trim() ? { eCourtLink: eCourtLink.trim() } : {}),
      ...(filingStatus && ["drafting", "filing", "filed"].includes(filingStatus) ? { filingStatus } : {}),
      ...(cleanReporting ? { reportingStatus: cleanReporting } : {}),
      status: initialStatus,
      isExistingCase: flaggedExisting,
      currentStep:    currentStep?.trim() || undefined,
      existingNotes:  existingNotes?.trim() || undefined,
      ...(enquiryDoc ? { enquiry: enquiryDoc } : {}),
      documents: voiceAttachment?.url
        ? [{
            label: voiceAttachment.label?.trim()
              || `Voice description${voiceAttachment.durationSec ? ` (${voiceAttachment.durationSec}s)` : ""}`,
            url: voiceAttachment.url,
            uploadedBy: session.id,
            uploadedAt: new Date(),
            ocrStatus: "pending" as const,
          }]
        : [],
      caseDiary: [],
      courtAppearances: [],
      ...(path === "criminal"
        ? {
            criminalPath: {
              firFiled: false,
              chargesheetFiled: false,
              chargesheetAlertSent: false,
              chargesFramed: false,
              chargeDocs: [],
              trial: {
                prosecutionWitnesses: [],
                defenseWitnesses: [],
                evidenceDocs: [],
                forensicDocs: [],
              },
            },
          }
        : {
            highCourtPath: {
              petitionFiled: { filed: false },
              supportingAffidavit: { filed: false },
              admission: { filed: false },
              counterAffidavit: { filed: false },
              rejoinder: { filed: false },
              pleaClose: { filed: false },
              inducement: { filed: false },
            },
          }),
    });

    return NextResponse.json({ case: newCase }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("POST /api/cases error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
