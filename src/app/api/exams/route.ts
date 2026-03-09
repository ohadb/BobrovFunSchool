import { NextRequest, NextResponse } from "next/server";
import { getExamResults, ExamResult } from "@/lib/examResultStore";

export async function GET(
  request: NextRequest,
): Promise<NextResponse<ExamResult[] | { error: string }>> {
  const studentId = request.nextUrl.searchParams.get("studentId");
  const courseId = request.nextUrl.searchParams.get("courseId");
  const lessonId = request.nextUrl.searchParams.get("lessonId");

  if (!studentId || !courseId || !lessonId) {
    return NextResponse.json(
      { error: "studentId, courseId, and lessonId are required" },
      { status: 400 },
    );
  }

  const results = await getExamResults(studentId, courseId, lessonId);
  return NextResponse.json(results);
}
