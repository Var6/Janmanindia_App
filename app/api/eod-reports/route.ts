import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { getSessionFromCookies } from "@/lib/auth";
import EodReport from "@/models/EodReport";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const reports = await EodReport.find({ submittedBy: session.id })
    .sort({ date: -1 })
    .lean();

  return NextResponse.json({ reports });
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json() as {
      date: string;
      summary: string;
      hoursWorked: number;
      expenses: { description: string; amount: number; receiptUrl?: string }[];
    };

    if (!body.date || !body.summary || !body.hoursWorked) {
      return NextResponse.json({ error: "date, summary and hoursWorked are required" }, { status: 400 });
    }

    await connectDB();

    const report = await EodReport.create({
      submittedBy: session.id,
      date: new Date(body.date),
      summary: body.summary.trim(),
      hoursWorked: body.hoursWorked,
      expenses: (body.expenses ?? []).map((ex) => ({
        description: ex.description,
        amount: ex.amount,
        receiptUrl: ex.receiptUrl ?? undefined,
      })),
      invoiceStatus: "pending",
    });

    return NextResponse.json({ report }, { status: 201 });
  } catch (err) {
    console.error("EOD create error:", err);
    return NextResponse.json({ error: "Failed to create report" }, { status: 500 });
  }
}
