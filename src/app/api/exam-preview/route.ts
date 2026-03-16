import { chatCompletion } from "@/lib/llm";
import { saveImage } from "@/lib/imageStore";
import type { LlmBackend } from "@/types/course";

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as {
    courseName: string;
    lessonTitle: string;
    lessonContent: string;
    language: string;
    llmBackend?: LlmBackend;
    currentPreview?: string;
    feedback?: string;
  };

  const backend: LlmBackend = body.llmBackend ?? "gemini";
  const lang = body.language === "he" ? "Hebrew (עברית)" : "English";
  const enableImages = backend === "gemini";

  const hasFeedback = body.currentPreview && body.feedback;

  // Parse existing questions from currentPreview when applying feedback
  const existingQuestions: string[] = [];
  if (hasFeedback && body.currentPreview) {
    const lines = body.currentPreview.split("\n");
    let current = "";
    for (const line of lines) {
      const match = line.match(/^\d+[\.\)]\s/);
      if (match) {
        if (current) existingQuestions.push(current.trim());
        current = line;
      } else {
        current += "\n" + line;
      }
    }
    if (current) existingQuestions.push(current.trim());
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller): Promise<void> {
      const send = (event: string, data: unknown): void => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      const previousQuestions: string[] = [];

      for (let i = 0; i < 5; i++) {
        const questionNum = i + 1;

        const previousContext =
          previousQuestions.length > 0
            ? `\n\nPrevious questions already generated (do NOT repeat or overlap with these):\n${previousQuestions.join("\n")}`
            : "";

        const prompt = hasFeedback
          ? `You are revising exam questions for a kids lesson.

Course: "${body.courseName}"
Lesson: "${body.lessonTitle}"
Content: ${body.lessonContent}

The original question #${questionNum} was:
${existingQuestions[i] ?? "(no original question)"}

The parent gave this feedback on the full set: "${body.feedback}"

Apply the feedback and generate ONLY the revised question #${questionNum}.${previousContext}

Requirements:
- Write in ${lang}.
- The question must have a numeric answer.
- Write it as "${questionNum}. <question text>"
- Keep it age-appropriate and concise.
- When the question would benefit from a visual illustration (e.g. a shape, a diagram, a visual math problem), generate an image alongside the question to help the student.`
          : `Generate ONLY question #${questionNum} (out of 5) for a kids lesson exam.

Course: "${body.courseName}"
Lesson: "${body.lessonTitle}"
Content: ${body.lessonContent}${previousContext}

Requirements:
- Write in ${lang}.
- The question must have a numeric answer.
- Write it as "${questionNum}. <question text>"
- Keep it age-appropriate and concise.
- When the question would benefit from a visual illustration (e.g. a shape, a diagram, a visual math problem), generate an image alongside the question to help the student.`;

        try {
          const result = await chatCompletion(
            backend,
            "",
            [{ role: "user", content: prompt }],
            enableImages,
          );

          const imageIds: string[] = [];
          for (const img of result.images) {
            const id = await saveImage(img.base64, img.mimeType);
            imageIds.push(id);
          }

          previousQuestions.push(result.text.trim());

          send("question", {
            index: i,
            text: result.text.trim(),
            images: imageIds,
          });
        } catch {
          send("question", {
            index: i,
            text: `${questionNum}. (Failed to generate question)`,
            images: [],
          });
        }
      }

      send("done", {});
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
