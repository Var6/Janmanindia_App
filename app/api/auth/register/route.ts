import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { COOKIE_NAME, hashPassword, signToken } from "@/lib/auth";
import { filterValidIssues } from "@/lib/case-issues";
import { phoneLoginFilter } from "@/lib/phone";
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
 * POST /api/auth/register
 *
 * The public Case Enquiry Form. It forms a community-member record so a social
 * worker can follow up — it does NOT create a case (a case is opened later from
 * inside the app, where the same mandatory facts are enforced).
 *
 * Mandatory: name, mobile (phone) and a point of contact (name + phone). Email
 * and password are optional: supply both to get a login account (auto-login),
 * or leave them blank to create a passwordless record that can be claimed later
 * by registering with the same email — mirrors /api/community/lite-create.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name, email, password, phone,
      pointOfContact,
      district, village, preferredLanguage,
      voiceIntroUrl, voiceIntroDurationSec,
      intakeDocs,
      enquiry,
    } = body as {
      name: string;
      email?: string;
      password?: string;
      phone?: string;
      pointOfContact?: { name?: string; phone?: string; address?: string };
      district?: string;
      village?: string;
      preferredLanguage?: string;
      voiceIntroUrl?: string;
      voiceIntroDurationSec?: number;
      intakeDocs?: string[];
      enquiry?: EnquiryInput;
    };

    const memberName = trim(name);
    const memberPhone = trim(phone);
    const pocName = trim(pointOfContact?.name);
    const pocPhone = trim(pointOfContact?.phone);

    if (!memberName) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }
    if (!memberPhone) {
      return NextResponse.json({ error: "Mobile number is required." }, { status: 400 });
    }

    // A password creates a login account (sign in later with mobile OR email).
    // Email is optional — community members who only have a phone can still get
    // an account. If a password is set it must be strong enough.
    const wantsLogin = Boolean(password) || Boolean(email?.trim());
    if (wantsLogin && (!password || password.length < 8)) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    await connectDB();

    // Email is unique on the User model. When the filer didn't ask for a login
    // we synthesise a stub address so the schema's unique constraint holds; the
    // member can later claim the account by registering with a real email.
    const realEmail = email?.trim().toLowerCase();
    if (realEmail) {
      const existing = await User.findOne({ email: realEmail });
      if (existing) return NextResponse.json({ error: "Email already registered." }, { status: 409 });
    }

    // For login accounts, the mobile number must resolve to a single account so
    // phone sign-in is unambiguous. (Passwordless intake stubs don't reserve it.)
    if (wantsLogin) {
      const phoneClash = await User.findOne(phoneLoginFilter(memberPhone!) ?? { _id: null });
      if (phoneClash) {
        return NextResponse.json(
          { error: "This mobile number already has an account. Please sign in instead." },
          { status: 409 }
        );
      }
    }
    const stubEmail = realEmail
      || `community-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}@noreply.janmanindia.local`;

    // Clean the optional enquiry facts (controlled-vocab issues, parsed date).
    let enquiryDoc: Record<string, unknown> | undefined;
    if (enquiry && typeof enquiry === "object") {
      const issues = filterValidIssues(enquiry.issues);
      const incidentDateTime = enquiry.incidentDateTime ? new Date(enquiry.incidentDateTime) : undefined;
      const accusedCount = typeof enquiry.accusedCount === "number"
        ? Math.max(0, Math.floor(enquiry.accusedCount))
        : undefined;
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

    const docs = Array.isArray(intakeDocs)
      ? intakeDocs.map((u) => trim(u)).filter(Boolean) as string[]
      : [];

    const passwordHash = wantsLogin && password ? await hashPassword(password) : undefined;

    const user = await User.create({
      name: memberName,
      email: stubEmail,
      ...(passwordHash ? { passwordHash, lastLoginAt: new Date() } : {}),
      role: "community",
      phone: memberPhone,
      isActive: true,
      communityProfile: {
        verificationStatus: "pending",
        district: trim(district),
        village: trim(village),
        preferredLanguage: trim(preferredLanguage),
        voiceIntroUrl: trim(voiceIntroUrl),
        voiceIntroDurationSec: typeof voiceIntroDurationSec === "number" ? Math.max(0, Math.floor(voiceIntroDurationSec)) : undefined,
        ...((pocName || pocPhone) ? { pointOfContact: { name: pocName, phone: pocPhone, address: trim(pointOfContact?.address) } } : {}),
        ...(enquiryDoc ? { enquiry: enquiryDoc } : {}),
        ...(docs.length ? { intakeDocs: docs } : {}),
      },
    });

    // Passwordless record — nothing to log into. The filer (often a paralegal
    // on someone's behalf) just sees a confirmation.
    if (!passwordHash) {
      return NextResponse.json(
        {
          success: true,
          account: "stub",
          message: "Enquiry received. A social worker will verify the details and reach out within 48 hours.",
        },
        { status: 201 }
      );
    }

    // Login account — auto-login so the member lands inside /community.
    const token = await signToken({ id: String(user._id), role: user.role, name: user.name });
    const response = NextResponse.json(
      {
        success: true,
        account: "login",
        role: user.role,
        redirectTo: "/community",
        message: "Welcome to Janman. A social worker will verify your details and reach out within 48 hours.",
      },
      { status: 201 }
    );
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    return response;
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
