import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { requireSession } from "@/lib/auth";
import Case from "@/models/Case";

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();

    if (!["litigation", "socialworker", "admin", "superadmin"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const { caseId, documentId } = body as { caseId: string; documentId: string };

    if (!caseId || !documentId) {
      return NextResponse.json({ error: "caseId and documentId are required" }, { status: 400 });
    }

    // Set ocrStatus to processing
    const result = await Case.updateOne(
      { _id: caseId, "documents._id": documentId },
      { $set: { "documents.$.ocrStatus": "processing" } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Case or document not found" }, { status: 404 });
    }

    // Retrieve the document URL for OCR processing
    const caseDoc = await Case.findOne(
      { _id: caseId, "documents._id": documentId },
      { "documents.$": 1 }
    ).lean();

    const docUrl = caseDoc?.documents?.[0]?.url;

    if (!docUrl) {
      return NextResponse.json({ error: "Document URL not found" }, { status: 404 });
    }

    // Enqueue OCR job asynchronously — in production replace with actual job queue
    enqueueOcrJob(caseId, documentId, docUrl).catch((err) =>
      console.error("OCR job error:", err)
    );

    return NextResponse.json({ success: true, status: "processing" });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("POST /api/documents/ocr error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// OCR callback — called by external OCR service (e.g., Google Document AI webhook)
export async function PATCH(request: NextRequest) {
  try {
    // In production, validate a shared secret or HMAC signature here
    const apiKey = request.headers.get("x-ocr-api-key");
    if (apiKey !== process.env.OCR_CALLBACK_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { caseId, documentId, ocrText, success } = body as {
      caseId: string;
      documentId: string;
      ocrText?: string;
      success: boolean;
    };

    if (!caseId || !documentId) {
      return NextResponse.json({ error: "caseId and documentId are required" }, { status: 400 });
    }

    await Case.updateOne(
      { _id: caseId, "documents._id": documentId },
      {
        $set: {
          "documents.$.ocrStatus": success ? "processed" : "failed",
          ...(success && ocrText
            ? {
                "documents.$.ocrText": ocrText,
                "documents.$.ocrProcessedAt": new Date(),
              }
            : {}),
        },
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/documents/ocr error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function enqueueOcrJob(
  caseId: string,
  documentId: string,
  docUrl: string
): Promise<void> {
  const ocrEndpoint = process.env.OCR_SERVICE_URL;
  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/documents/ocr`;

  if (!ocrEndpoint) {
    // Gracefully degrade — mark as failed if no OCR service configured
    await Case.updateOne(
      { _id: caseId, "documents._id": documentId },
      { $set: { "documents.$.ocrStatus": "failed" } }
    );
    return;
  }

  await fetch(ocrEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OCR_SERVICE_KEY ?? ""}`,
    },
    body: JSON.stringify({
      documentUrl: docUrl,
      callbackUrl,
      callbackSecret: process.env.OCR_CALLBACK_SECRET,
      metadata: { caseId, documentId },
    }),
  });
}
