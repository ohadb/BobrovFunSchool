import { NextRequest, NextResponse } from "next/server";
import { addStudyTime, getUsageLast7Days } from "@/lib/usageStore";
import { getStudentMessageCountsByDay } from "@/lib/chatStore";

export async function GET(
  request: NextRequest,
): Promise<
  NextResponse<
    { date: string; minutes: number; messages: number }[] | { error: string }
  >
> {
  const studentId = request.nextUrl.searchParams.get("studentId");
  if (!studentId) {
    return NextResponse.json(
      { error: "studentId is required" },
      { status: 400 },
    );
  }
  const usage = await getUsageLast7Days(studentId);
  const messageCounts = await getStudentMessageCountsByDay(studentId);
  const enriched = usage.map((day) => ({
    ...day,
    messages: messageCounts[day.date] ?? 0,
  }));
  return NextResponse.json(enriched);
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<{ success: boolean } | { error: string }>> {
  const body = (await request.json()) as {
    studentId: string;
    seconds: number;
  };
  if (!body.studentId || !body.seconds) {
    return NextResponse.json(
      { error: "studentId and seconds are required" },
      { status: 400 },
    );
  }
  await addStudyTime(body.studentId, body.seconds);
  return NextResponse.json({ success: true });
}
