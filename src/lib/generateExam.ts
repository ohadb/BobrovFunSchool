import Anthropic from "@anthropic-ai/sdk";
import type { CourseLanguage } from "@/types/course";

const anthropic = new Anthropic();

export async function generateExamQuestions(
  lessonTitle: string,
  lessonContent: string,
  language: CourseLanguage,
): Promise<string> {
  const lang = language === "he" ? "Hebrew (עברית)" : "English";

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Generate 3-5 short comprehension questions for a kids' lesson.

Lesson title: "${lessonTitle}"
Lesson content: ${lessonContent}

Write the questions in ${lang}. Keep them age-appropriate, clear, and directly related to the lesson content. Number them. Do not include answers.`,
      },
    ],
  });

  return response.content[0].type === "text" ? response.content[0].text : "";
}
