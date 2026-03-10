import { NextRequest, NextResponse } from "next/server";
import { getInterests, setInterests } from "@/lib/interestsStore";

export async function GET(
  request: NextRequest,
): Promise<NextResponse<string[] | { error: string }>> {
  const studentId = request.nextUrl.searchParams.get("studentId");

  if (!studentId) {
    return NextResponse.json(
      { error: "studentId is required" },
      { status: 400 },
    );
  }

  const interests = await getInterests(studentId);
  return NextResponse.json(interests);
}

export async function PUT(
  request: NextRequest,
): Promise<NextResponse<{ ok: boolean } | { error: string }>> {
  const body = (await request.json()) as {
    studentId: string;
    interests: string[];
  };

  if (!body.studentId || !Array.isArray(body.interests)) {
    return NextResponse.json(
      { error: "studentId and interests array are required" },
      { status: 400 },
    );
  }

  await setInterests(body.studentId, body.interests);
  return NextResponse.json({ ok: true });
}
