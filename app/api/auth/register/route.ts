import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { COOKIE_NAME, hashPassword, signToken } from "@/lib/auth";
import User from "@/models/User";

/**
 * Normalise the form's snake / lowercase ID-type values to the canonical
 * enum the User schema expects. Anything unrecognised lands as "Other" so
 * registration can't be silently rejected by enum validation.
 */
function normaliseGovtIdType(raw?: string): "Aadhar" | "VoterId" | "Passport" | "DrivingLicense" | "RationCard" | "Other" {
  const v = String(raw ?? "").trim().toLowerCase().replace(/[\s_-]+/g, "");
  switch (v) {
    case "aadhaar":
    case "aadhar":           return "Aadhar";
    case "voterid":
    case "voter":            return "VoterId";
    case "passport":         return "Passport";
    case "drivinglicense":
    case "drivingliscence":
    case "dl":               return "DrivingLicense";
    case "rationcard":
    case "ration":           return "RationCard";
    default:                 return "Other";
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name, email, password, phone,
      govtIdUrl, govtIdType,
      district, village, preferredLanguage,
      voiceIntroUrl, voiceIntroDurationSec,
    } = body as {
      name: string;
      email: string;
      password: string;
      phone?: string;
      govtIdUrl?: string;
      govtIdType?: string;
      district?: string;
      village?: string;
      preferredLanguage?: string;
      voiceIntroUrl?: string;
      voiceIntroDurationSec?: number;
    };

    if (!name?.trim() || !email?.trim() || !password) {
      return NextResponse.json({ error: "Name, email, and password are required." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }
    // Either an ID document OR a voice intro must be provided so the social
    // worker has something to work with at verification time.
    if (!govtIdUrl?.trim() && !voiceIntroUrl?.trim()) {
      return NextResponse.json(
        { error: "Please attach an ID document or record a short voice introduction so a social worker can verify you." },
        { status: 400 }
      );
    }

    await connectDB();

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return NextResponse.json({ error: "Email already registered." }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role: "community",
      phone: phone?.trim() || undefined,
      isActive: true,
      lastLoginAt: new Date(),
      communityProfile: {
        govtIdUrl: govtIdUrl?.trim() || undefined,
        govtIdType: govtIdUrl ? normaliseGovtIdType(govtIdType) : undefined,
        verificationStatus: "pending",
        district: district?.trim() || undefined,
        village: village?.trim() || undefined,
        preferredLanguage: preferredLanguage?.trim() || undefined,
        voiceIntroUrl: voiceIntroUrl?.trim() || undefined,
        voiceIntroDurationSec: typeof voiceIntroDurationSec === "number" ? Math.max(0, Math.floor(voiceIntroDurationSec)) : undefined,
      },
    });

    // Auto-login: a community member who just gave us their details shouldn't
    // have to type them again. Sign the same JWT the login route uses and set
    // the auth_token cookie so the next request lands them inside /community.
    const token = await signToken({
      id: String(user._id),
      role: user.role,
      name: user.name,
    });

    const response = NextResponse.json(
      {
        success: true,
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
