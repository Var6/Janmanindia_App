import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { hashPassword } from "@/lib/auth";
import User from "@/models/User";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, phone, govtIdUrl, govtIdType } = body as {
      name: string;
      email: string;
      password: string;
      phone?: string;
      govtIdUrl: string;
      govtIdType: string;
    };

    if (!name || !email || !password || !govtIdUrl || !govtIdType) {
      return NextResponse.json(
        { error: "name, email, password, govtIdUrl, and govtIdType are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    await connectDB();

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role: "user",
      phone,
      isActive: true,
      citizenProfile: {
        govtIdUrl,
        govtIdType,
        verificationStatus: "pending",
      },
    });

    // Do NOT set auth cookie — account requires verification first
    return NextResponse.json(
      {
        success: true,
        message: "Registration successful. Your account is pending ID verification by a social worker.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
