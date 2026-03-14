import { NextRequest, NextResponse } from "next/server";
import { getChatSession } from "@/lib/chatStore";
import { getExamResults } from "@/lib/examResultStore";

export interface LessonProgress {
  lessonId: string;
  messageCount: number;
  bestScore: number | null;
  lastActivity: string | null;
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<LessonProgress[] | { error: string }>> {
  const studentId = request.nextUrl.searchParams.get("studentId");
  const courseId = request.nextUrl.searchParams.get("courseId");
  const lessonIds = request.nextUrl.searchParams.get("lessonIds");

  if (!studentId || !courseId || !lessonIds) {
    return NextResponse.json(
      { error: "studentId, courseId, and lessonIds are required" },
      { status: 400 },
    );
  }

  const ids = lessonIds.split(",");
  const results: LessonProgress[] = [];

  for (const lessonId of ids) {
    const session = await getChatSession(studentId, courseId, lessonId);
    const exams = await getExamResults(studentId, courseId, lessonId);

    const messageCount = session.messages.filter((m) => m.role === "user").length;
    const bestScore = exams.length > 0
      ? Math.max(...exams.map((e) => Math.round((e.correct / e.total) * 100)))
      : null;
    const lastActivity = session.messages.length > 0
      ? session.messages[session.messages.length - 1].timestamp
      : null;

    results.push({ lessonId, messageCount, bestScore, lastActivity });
  }

  return NextResponse.json(results);
}
