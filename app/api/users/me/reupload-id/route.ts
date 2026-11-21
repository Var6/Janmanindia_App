import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import User from "@/models/User";
import { deleteStoredFile } from "@/lib/storage";

const ID_TYPES = ["Aadhar", "VoterId", "Passport", "DrivingLicense", "RationCard", "Other"];

/**
 * Re-upload flow used when a community member's ID was rejected by a social
 * worker. The client posts the *new* uploaded URL (already pushed to R2 via
 * /api/upload) plus the ID type. We:
 *   1. delete the old object from R2 so a rejected document doesn't linger
 *   2. point the user record at the new URL
 *   3. reset verificationStatus → "pending" and clear rejection reason
 *
 * Only the community member themselves can call this.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    if (session.role !== "community") {
      return NextResponse.json({ error: "Only community members can re-upload their ID." }, { status: 403 });
    }

    const body = await request.json() as { govtIdUrl?: string; govtIdType?: string };
    const newUrl = body.govtIdUrl?.trim();
    const newType = body.govtIdType?.trim();
    if (!newUrl) {
      return NextResponse.json({ error: "govtIdUrl is required." }, { status: 400 });
    }
    if (!newType || !ID_TYPES.includes(newType)) {
      return NextResponse.json({ error: `govtIdType must be one of ${ID_TYPES.join(", ")}.` }, { status: 400 });
    }

    await connectDB();
    const user = await User.findById(session.id);
    if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

    const oldUrl = user.communityProfile?.govtIdUrl;

    // Best-effort delete the old object from Cloudflare R2. We swallow errors
    // here so a transient R2 outage doesn't block the user from re-uploading
    // — the user's record is the source of truth and we'll have already moved
    // it forward. The orphan object is recoverable later via the audit log.
    if (oldUrl && oldUrl !== newUrl) {
      try {
        // Works for both link forms (public R2 link or /api/files/...); a
        // link that is not ours is skipped.
        await deleteStoredFile(oldUrl);
      } catch (err) {
        console.error("R2 delete failed (non-fatal):", err);
      }
    }

    // Reset verification: new URL, new type, status back to pending, drop the
    // rejection reason since the old reason no longer applies to a fresh
    // upload.
    await User.updateOne({ _id: session.id }, {
      $set: {
        "communityProfile.govtIdUrl": newUrl,
        "communityProfile.govtIdType": newType,
        "communityProfile.verificationStatus": "pending",
      },
      $unset: {
        "communityProfile.rejectionReason": "",
        "communityProfile.verifiedAt": "",
        "communityProfile.verifiedBy": "",
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("POST /api/users/me/reupload-id error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
