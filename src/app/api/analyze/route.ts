import { NextRequest, NextResponse } from "next/server";
import { chatCompletion } from "@/lib/llm";
import { getChatSession } from "@/lib/chatStore";
import { getCourseById } from "@/lib/courseStore";
import { APP_USERS } from "@/types/user";

export async function GET(
  request: NextRequest,
): Promise<NextResponse<{ analysis: string } | { error: string }>> {
  const studentId = request.nextUrl.searchParams.get("studentId");
  const courseId = request.nextUrl.searchParams.get("courseId");
  const lessonId = request.nextUrl.searchParams.get("lessonId");

  if (!studentId || !courseId || !lessonId) {
    return NextResponse.json(
      { error: "studentId, courseId, and lessonId are required" },
      { status: 400 },
    );
  }

  const course = await getCourseById(courseId);
  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  const lesson = course.lessons.find((l) => l.id === lessonId);
  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  const session = await getChatSession(studentId, courseId, lessonId);

  if (session.messages.length === 0) {
    return NextResponse.json({
      analysis: "The student has not started this lesson yet.",
    });
  }

  const student = APP_USERS.find((u) => u.id === studentId);
  const studentName = student?.name ?? studentId;

  const chatTranscript = session.messages
    .map((m) => `${m.role === "user" ? studentName : "Tutor"}: ${m.content}`)
    .join("\n\n");

  const backend = course.llmBackend ?? "gemini";
  const systemPrompt = `You are an educational analyst helping parents understand their child's learning progress. Analyze the chat transcript between a student and their AI tutor. Write in Hebrew. Be concise and actionable.`;
  const result = await chatCompletion(backend, systemPrompt, [
    {
      role: "user",
      content: `Analyze the following study session for student "${studentName}" on the lesson "${lesson.title}" from course "${course.name}".

Lesson content: ${lesson.content}

Chat transcript:
${chatTranscript}

Provide a brief analysis covering:
1. How well the student understands the lesson material
2. Topics the student struggled with (if any)
3. Topics the student mastered
4. Recommendations for improvement
Keep it concise — 4-6 sentences.`,
    },
  ]);

  return NextResponse.json({ analysis: result.text });
}
