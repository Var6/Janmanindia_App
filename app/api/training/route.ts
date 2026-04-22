import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import TrainingMaterial, { type TrainingFileType } from "@/models/TrainingMaterial";

const VALID_TYPES: TrainingFileType[] = ["pdf", "doc", "ppt", "image", "video", "other"];

/** GET /api/training — list approved materials (everyone can see). */
export async function GET() {
  try {
    await requireSession();
    await connectDB();
    const materials = await TrainingMaterial.find({ status: "approved" })
      .sort({ createdAt: -1 })
      .populate("uploadedBy", "name role")
      .lean();
    return NextResponse.json({ materials });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/** POST /api/training — upload a new material (any role except community). */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    if (session.role === "community") {
      return NextResponse.json({ error: "Community members cannot upload training materials" }, { status: 403 });
    }
    if (!mongoose.Types.ObjectId.isValid(session.id)) {
      return NextResponse.json({ error: "Invalid session — re-login" }, { status: 400 });
    }

    const body = await req.json();
    const { title, description, category, fileUrl, fileType } = body as {
      title?: string; description?: string; category?: string;
      fileUrl?: string; fileType?: TrainingFileType;
    };

    if (!title?.trim()) return NextResponse.json({ error: "Title is required" }, { status: 400 });
    if (!fileUrl?.trim()) return NextResponse.json({ error: "File URL is required" }, { status: 400 });
    if (!fileType || !VALID_TYPES.includes(fileType)) {
      return NextResponse.json({ error: "Invalid fileType" }, { status: 400 });
    }

    await connectDB();
    const material = await TrainingMaterial.create({
      title: title.trim(),
      description: description?.trim(),
      category: category?.trim(),
      fileUrl: fileUrl.trim(),
      fileType,
      uploadedBy: new mongoose.Types.ObjectId(session.id),
      status: "pending",
    });

    return NextResponse.json({ material }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("training upload error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
