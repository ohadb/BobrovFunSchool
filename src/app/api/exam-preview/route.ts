import { NextResponse } from "next/server";
import { chatCompletion } from "@/lib/llm";
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

  const prompt = hasFeedback
    ? `You are revising an exam question for a kids lesson.

Course: "${body.courseName}"
Lesson: "${body.lessonTitle}"
Content: ${body.lessonContent}

The original question #${questionNum} was:
${body.currentQuestion}

The parent gave this feedback on the full set: "${body.feedback}"

Apply the feedback and generate ONLY the revised question #${questionNum}.

Requirements:
- Write in ${lang}.
- The question must have a numeric answer.
- Write it as "${questionNum}. <question text>"
- Keep it age-appropriate and concise.
- When the question would benefit from a visual illustration (e.g. a shape, a diagram, a visual math problem), generate an image alongside the question to help the student. Image style: minimalist 2D icon, clean background, low-fidelity sketch style.`
    : `Generate ONLY question #${questionNum} (out of 5) for a kids lesson exam.

Course: "${body.courseName}"
Lesson: "${body.lessonTitle}"
Content: ${body.lessonContent}

Requirements:
- Write in ${lang}.
- The question must have a numeric answer.
- Write it as "${questionNum}. <question text>"
- Keep it age-appropriate and concise.
- Make sure this question is unique and different from other questions in the exam.
- When the question would benefit from a visual illustration (e.g. a shape, a diagram, a visual math problem), generate an image alongside the question to help the student. Image style: minimalist 2D icon, clean background, low-fidelity sketch style.`;

  try {
    const llmStart = Date.now();
    const result = await chatCompletion(
      backend,
      "",
      [{ role: "user", content: prompt }],
      enableImages,
    );
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
    console.log(`[exam-preview] Q${questionNum} total: ${totalMs}ms`);

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
