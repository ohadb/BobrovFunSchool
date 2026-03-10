import { NextRequest, NextResponse } from "next/server";
import {
  getChatSession,
  clearChatSession,
  removeLastMessage,
} from "@/lib/chatStore";
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

export async function DELETE(
  request: NextRequest,
): Promise<NextResponse<{ ok: boolean } | { error: string }>> {
  const studentId = request.nextUrl.searchParams.get("studentId");
  const courseId = request.nextUrl.searchParams.get("courseId");
  const lessonId = request.nextUrl.searchParams.get("lessonId");

  if (!studentId || !courseId || !lessonId) {
    return NextResponse.json(
      { error: "studentId, courseId, and lessonId are required" },
      { status: 400 },
    );
  }

  await clearChatSession(studentId, courseId, lessonId);
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  request: NextRequest,
): Promise<NextResponse<{ ok: boolean } | { error: string }>> {
  const studentId = request.nextUrl.searchParams.get("studentId");
  const courseId = request.nextUrl.searchParams.get("courseId");
  const lessonId = request.nextUrl.searchParams.get("lessonId");

  if (!studentId || !courseId || !lessonId) {
    return NextResponse.json(
      { error: "studentId, courseId, and lessonId are required" },
      { status: 400 },
    );
  }

  await removeLastMessage(studentId, courseId, lessonId);
  return NextResponse.json({ ok: true });
}
