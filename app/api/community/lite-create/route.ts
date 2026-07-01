import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import { filterValidIssues } from "@/lib/case-issues";
import User from "@/models/User";

type EnquiryInput = {
  relationshipWithVictim?: string;
  victimName?: string;
  victimAddress?: string;
  issues?: unknown;
  accusedNames?: string;
  accusedCount?: number;
  factsOfTheCase?: string;
  firNumber?: string;
  policeStation?: string;
  placeOfOccurrence?: string;
  incidentDateTime?: string;
};

const trim = (s: unknown) => (typeof s === "string" ? s.trim() : "") || undefined;

/**
 * POST /api/community/lite-create
 *
 * Create a stub community-member account on behalf of someone who hasn't
 * signed up themselves yet. Used by the case-enquiry form when a community
 * member or social worker is filing for a victim that isn't already in the
 * system. The created user has no password — they can claim the account
 * later by registering with the same email.
 *
 * Authorisation: any signed-in role except `pending`. Community members are
 * allowed because the enquiry workflow is community-facing — the original
 * Google Form was filled by community paralegals on behalf of victims.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    if (session.role === "pending") {
      return NextResponse.json({ error: "Account not yet activated." }, { status: 403 });
    }

    const body = await request.json();
    const { name, phone, email, district, village, pointOfContact, enquiry, intakeDocs } = body as {
      name: string;
      phone?: string;
      email?: string;
      district?: string;
      village?: string;
      pointOfContact?: { name?: string; phone?: string; address?: string };
      enquiry?: EnquiryInput;
      intakeDocs?: string[];
    };

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }
    if (!phone?.trim() && !email?.trim()) {
      return NextResponse.json(
        { error: "Provide a phone number or email so the social worker can reach them." },
        { status: 400 }
      );
    }

    await connectDB();

    // Email is unique on the User model. If the caller didn't supply one, we
    // synthesise a stub address so the schema's required+unique constraint
    // holds. The user can later overwrite this when they register themselves.
    const stubEmail = email?.trim().toLowerCase()
      || `community-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}@noreply.janmanindia.local`;

    const existing = await User.findOne({ email: stubEmail });
    if (existing) {
      return NextResponse.json(
        { error: "A community member with that email already exists.", existingId: String(existing._id) },
        { status: 409 }
      );
    }

    // A client/victim created by a staff member is immediately usable — no ID
    // verification step gates case entry. Community members filing on someone
    // else's behalf still create a "pending" profile the SW verifies later.
    const isStaff = session.role !== "community";
    const poc = pointOfContact && (pointOfContact.name?.trim() || pointOfContact.phone?.trim())
      ? {
          name: pointOfContact.name?.trim() || undefined,
          phone: pointOfContact.phone?.trim() || undefined,
          address: pointOfContact.address?.trim() || undefined,
        }
      : undefined;

    // Clean the optional Case Enquiry facts (controlled-vocab issues, parsed date).
    let enquiryDoc: Record<string, unknown> | undefined;
    if (enquiry && typeof enquiry === "object") {
      const issues = filterValidIssues(enquiry.issues);
      const incidentDateTime = enquiry.incidentDateTime ? new Date(enquiry.incidentDateTime) : undefined;
      const accusedCount = typeof enquiry.accusedCount === "number" ? Math.max(0, Math.floor(enquiry.accusedCount)) : undefined;
      enquiryDoc = {
        relationshipWithVictim: trim(enquiry.relationshipWithVictim),
        victimName: trim(enquiry.victimName),
        victimAddress: trim(enquiry.victimAddress),
        issues: issues.length ? issues : undefined,
        accusedNames: trim(enquiry.accusedNames),
        accusedCount,
        factsOfTheCase: trim(enquiry.factsOfTheCase),
        firNumber: trim(enquiry.firNumber),
        policeStation: trim(enquiry.policeStation),
        placeOfOccurrence: trim(enquiry.placeOfOccurrence),
        incidentDateTime: incidentDateTime && !isNaN(incidentDateTime.getTime()) ? incidentDateTime : undefined,
      };
      if (!Object.values(enquiryDoc).some((v) => v !== undefined)) enquiryDoc = undefined;
    }
    const docUrls = Array.isArray(intakeDocs) ? intakeDocs.map((u) => trim(u)).filter(Boolean) as string[] : [];

    const user = await User.create({
      name: name.trim(),
      email: stubEmail,
      role: "community",
      phone: phone?.trim() || undefined,
      isActive: true,
      communityProfile: {
        district: district?.trim() || undefined,
        village: village?.trim() || undefined,
        verificationStatus: isStaff ? "verified" : "pending",
        ...(isStaff ? { verifiedBy: session.id, verifiedAt: new Date() } : {}),
        ...(poc ? { pointOfContact: poc } : {}),
        ...(enquiryDoc ? { enquiry: enquiryDoc } : {}),
        ...(docUrls.length ? { intakeDocs: docUrls } : {}),
      },
    });

    return NextResponse.json(
      {
        user: {
          _id: String(user._id),
          name: user.name,
          email: user.email,
          phone: user.phone,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("POST /api/community/lite-create error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
