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
  };

  const lang = body.language === "he" ? "Hebrew (עברית)" : "English";

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `Generate a preview of 5 exam questions for a kids lesson.

Course: "${body.courseName}"
Lesson: "${body.lessonTitle}"
Content: ${body.lessonContent}

Requirements:
- Write in ${lang}.
- All questions must have numeric answers.
- Just list the 5 questions numbered 1-5, nothing else.
- Keep them age-appropriate and concise.`,
      },
    ],
  });

  const preview =
    response.content[0].type === "text" ? response.content[0].text : "";

  return NextResponse.json({ preview });
}
