import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export async function POST(
  request: Request,
): Promise<NextResponse<{ preview: string }>> {
  const body = (await request.json()) as {
    courseName: string;
    lessonTitle: string;
    lessonContent: string;
    language: string;
    currentPreview?: string;
    feedback?: string;
  };

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

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    messages: [{ role: "user", content: prompt }],
  });

  const preview =
    response.content[0].type === "text" ? response.content[0].text : "";

  return NextResponse.json({ preview });
}
