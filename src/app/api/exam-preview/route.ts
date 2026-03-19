import { NextResponse } from "next/server";
import { chatCompletion, geminiExamCompletion } from "@/lib/llm";
import { saveImage } from "@/lib/imageStore";
import type { LlmBackend } from "@/types/course";

interface ExamPreviewRequest {
  courseName: string;
  lessonTitle: string;
  lessonContent: string;
  language: string;
  llmBackend?: LlmBackend;
  questionNum: number;
  currentQuestion?: string;
  feedback?: string;
}

interface ExamPreviewResponse {
  index: number;
  text: string;
  images: string[];
}

export async function POST(
  request: Request,
): Promise<NextResponse<ExamPreviewResponse | { error: string }>> {
  const body = (await request.json()) as ExamPreviewRequest;

  const backend: LlmBackend = body.llmBackend ?? "gemini";
  const lang = body.language === "he" ? "Hebrew (עברית)" : "English";
  const enableImages = backend === "gemini";
  const questionNum = body.questionNum ?? 1;

  const hasFeedback = body.currentQuestion && body.feedback;

  const systemPrompt = `You are creating exam questions for a kids lesson.

Course: "${body.courseName}"
Lesson: "${body.lessonTitle}"
Content: ${body.lessonContent}

Requirements:
- Write in ${lang}.
- The question must have a numeric answer.
- Keep it age-appropriate and concise.
- You MUST generate exactly ONE image for every question. The image should illustrate the question visually (e.g. a shape, a diagram, a visual math problem). Image style: minimalist 2D icon, clean background, low-fidelity sketch style.
- IMPORTANT: Always include the question as text AND an image. Both must always be present.`;

  const userMessage = hasFeedback
    ? `Revise question #${questionNum}. The original was:
${body.currentQuestion}

Parent feedback: "${body.feedback}"

Apply the feedback and generate ONLY the revised question #${questionNum}.
Write it as "${questionNum}. <question text>"
You MUST also generate an image illustrating this question.`
    : `Generate ONLY question #${questionNum} (out of 5).
Write it as "${questionNum}. <question text>"
You MUST also generate an image illustrating this question.`;

  try {
    const llmStart = Date.now();
    const result = backend === "gemini"
      ? await geminiExamCompletion(systemPrompt, userMessage)
      : await chatCompletion(backend, systemPrompt, [{ role: "user", content: userMessage }]);
    const llmMs = Date.now() - llmStart;
    console.log(`[exam-preview] Q${questionNum} LLM took ${llmMs}ms (${backend}, images=${enableImages}, generatedImages=${result.images.length})`);

    const imageIds: string[] = [];
    if (result.images.length > 0) {
      const imgStart = Date.now();
      for (const img of result.images) {
        const sizeKB = Math.round((img.base64.length * 3) / 4 / 1024);
        console.log(`[exam-preview] Q${questionNum} image: ${img.mimeType}, ~${sizeKB}KB base64`);
        const id = await saveImage(img.base64, img.mimeType);
        imageIds.push(id);
      }
      console.log(`[exam-preview] Q${questionNum} saving ${imageIds.length} images took ${Date.now() - imgStart}ms`);
    }

    const totalMs = Date.now() - llmStart;
    console.log(`[exam-preview] Q${questionNum} total: ${totalMs}ms | text="${result.text.trim().slice(0, 80)}" | imageIds=[${imageIds.join(", ")}]`);

    return NextResponse.json({
      index: questionNum - 1,
      text: result.text.trim(),
      images: imageIds,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[exam-preview] Q${questionNum} FAILED after ${Date.now()}ms: ${message}`);
    return NextResponse.json(
      { error: `Failed to generate question ${questionNum}: ${message}` },
      { status: 500 },
    );
  }
}
