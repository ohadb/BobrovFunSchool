import { NextResponse } from "next/server";
import { chatCompletion } from "@/lib/llm";
import type { LlmBackend } from "@/types/course";

export async function POST(
  request: Request,
): Promise<NextResponse<{ preview: string }>> {
  const body = (await request.json()) as {
    courseName: string;
    lessonTitle: string;
    lessonContent: string;
    language: string;
    llmBackend?: LlmBackend;
    currentPreview?: string;
    feedback?: string;
  };

  const backend: LlmBackend = body.llmBackend ?? "claude";

  const lang = body.language === "he" ? "Hebrew (עברית)" : "English";

  const prompt =
    body.currentPreview && body.feedback
      ? `Here are the current exam questions for a kids lesson:

Course: "${body.courseName}"
Lesson: "${body.lessonTitle}"
Content: ${body.lessonContent}

Current questions:
${body.currentPreview}

The parent gave this feedback: "${body.feedback}"

Apply the feedback and generate a revised set of 5 exam questions.
Requirements:
- Write in ${lang}.
- All questions must have numeric answers.
- Just list the 5 questions numbered 1-5, nothing else.
- Keep them age-appropriate and concise.`
      : `Generate a preview of 5 exam questions for a kids lesson.

Course: "${body.courseName}"
Lesson: "${body.lessonTitle}"
Content: ${body.lessonContent}

Requirements:
- Write in ${lang}.
- All questions must have numeric answers.
- Just list the 5 questions numbered 1-5, nothing else.
- Keep them age-appropriate and concise.`;

  const result = await chatCompletion(backend, "", [
    { role: "user", content: prompt },
  ]);

  return NextResponse.json({ preview: result.text });
}
