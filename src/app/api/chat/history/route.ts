import { NextRequest, NextResponse } from "next/server";
import { getChatSession } from "@/lib/chatStore";
import type { ChatMessage } from "@/types/chat";

export async function GET(
  request: NextRequest,
): Promise<NextResponse<ChatMessage[] | { error: string }>> {
  const studentId = request.nextUrl.searchParams.get("studentId");
  const courseId = request.nextUrl.searchParams.get("courseId");
  const lessonId = request.nextUrl.searchParams.get("lessonId");

  if (!studentId || !courseId || !lessonId) {
    return NextResponse.json(
      { error: "studentId, courseId, and lessonId are required" },
      { status: 400 },
    );
  }

  const session = await getChatSession(studentId, courseId, lessonId);
  return NextResponse.json(session.messages);
}
