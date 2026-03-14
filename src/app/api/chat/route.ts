import { NextResponse } from "next/server";
import { getChatSession, saveChatMessage } from "@/lib/chatStore";
import { getCourseById } from "@/lib/courseStore";
import { saveExamResult } from "@/lib/examResultStore";
import { getInterests } from "@/lib/interestsStore";
import { chatCompletion } from "@/lib/llm";
import { saveImage } from "@/lib/imageStore";
import type { ChatRequestBody, ChatMessage } from "@/types/chat";

export async function POST(
  request: Request,
): Promise<NextResponse<ChatMessage | { error: string }>> {
  const body = (await request.json()) as ChatRequestBody;
  const { studentId, studentName, courseId, lessonId, message, examMode } = body;

  if (!studentId || !courseId || !lessonId || !message) {
    return NextResponse.json(
      { error: "studentId, courseId, lessonId, and message are required" },
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

  const userMessage: ChatMessage = {
    role: "user",
    content: message,
    timestamp: new Date().toISOString(),
  };
  await saveChatMessage(studentId, courseId, lessonId, userMessage);

  const isHebrew = course.language === "he";
  const interests = await getInterests(studentId);
  const backend = course.llmBackend ?? "gemini";
  const canGenerateImages = backend === "gemini";
  const systemPrompt = examMode
    ? buildExamPrompt(
        course.name,
        lesson.title,
        lesson.content,
        studentName,
        isHebrew,
        interests,
        lesson.exam?.preview,
        canGenerateImages,
      )
    : buildSystemPrompt(
        course.name,
        lesson.title,
        lesson.content,
        studentName,
        isHebrew,
        interests,
        canGenerateImages,
      );

  const historyMessages = [
    ...session.messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: message },
  ];

  const enableImages = canGenerateImages;
  const llmResult = await chatCompletion(
    backend,
    systemPrompt,
    historyMessages,
    enableImages,
  );

  const imageIds: string[] = [];
  console.log(`[chat] backend=${backend} images=${llmResult.images.length} debug=${llmResult.debug}`);
  for (const img of llmResult.images) {
    const id = await saveImage(img.base64, img.mimeType);
    imageIds.push(id);
  }

  const assistantMessage: ChatMessage = {
    role: "assistant",
    content: llmResult.text,
    ...(imageIds.length > 0 ? { images: imageIds } : {}),
    timestamp: new Date().toISOString(),
  };
  await saveChatMessage(studentId, courseId, lessonId, assistantMessage);

  if (examMode) {
    const scoreMatch = llmResult.text.match(/\[SCORE:\s*(\d+)\/(\d+)\]/);
    if (scoreMatch) {
      await saveExamResult(
        studentId,
        courseId,
        lessonId,
        parseInt(scoreMatch[1], 10),
        parseInt(scoreMatch[2], 10),
      );
    }
  }

  return NextResponse.json({ ...assistantMessage, llmDebug: llmResult.debug });
}

function buildSystemPrompt(
  courseName: string,
  lessonTitle: string,
  lessonContent: string,
  studentName: string,
  isHebrew: boolean,
  interests: string[],
  canGenerateImages: boolean,
): string {
  const lang = isHebrew ? "Hebrew (עברית)" : "English";
  const interestsLine =
    interests.length > 0
      ? `\n- The student has the following topics of interest: ${interests.join(", ")}. Whenever possible, use examples, analogies, and questions related to these topics to make the lesson more engaging and relatable.`
      : "";
  return `You are a friendly, encouraging female teacher for kids. You are teaching a lesson from the course "${courseName}".
The student's name is ${studentName}.

Current lesson: "${lessonTitle}"
Lesson content: ${lessonContent}

Instructions:
- Respond in ${lang}.
- NEVER use LaTeX, MathJax, or any math markup like $, \\frac, \\times etc. Write all math in plain text (e.g. "2/3" not "$\\frac{2}{3}$", "3 × 4" not "$3 \\times 4$").
- NEVER use markdown formatting like *, **, #, or `. Write plain text only — no bold, italic, headers, or code blocks.
- You are a female teacher — speak and refer to yourself accordingly.
- Address the student by their name (${studentName}) and as a women, and always add a compliment adjective before their name (e.g. "החכמה", "המדהימה", "היפה", "המוכשרת", "הנפלאה").
- Greet them warmly by name when starting the lesson.
- Teach the lesson content in a fun, age-appropriate way. Make sure to cover all the key concepts thoroughly so the student will be prepared to succeed in the exam on this lesson.
- Ask comprehension questions to check understanding.
- Give positive reinforcement and gentle corrections.
- Keep responses concise (2-4 sentences usually).
- If the student seems confused, try explaining differently.
- Be funny when possible — use humor to make learning enjoyable.
- Stay on topic — focus on this lesson's content.
- NEVER link to external images or URLs. Do not use markdown image syntax or provide links to imgur or any other site.${interestsLine}${canGenerateImages ? `\n- When explaining a concept that would benefit from a visual illustration (diagrams, shapes, charts, visual math problems, etc.), generate an image to help the student understand. Only generate images when a visual truly aids comprehension — not for every response.` : ""}`;
}

function buildExamPrompt(
  courseName: string,
  lessonTitle: string,
  lessonContent: string,
  studentName: string,
  isHebrew: boolean,
  interests: string[],
  examPreview?: string,
  canGenerateImages?: boolean,
): string {
  const lang = isHebrew ? "Hebrew (עברית)" : "English";
  const interestsLine =
    interests.length > 0
      ? `\n- The student has the following topics of interest: ${interests.join(", ")}. Whenever possible, frame questions using scenarios or examples related to some of these topics.`
      : "";
  return `You are a friendly female examiner for kids. You are testing a student named ${studentName} on a lesson from the course "${courseName}".

Current lesson: "${lessonTitle}"
Lesson content: ${lessonContent}

Instructions:
- Respond in ${lang}.
- NEVER use LaTeX, MathJax, or any math markup like $, \\frac, \\times etc. Write all math in plain text (e.g. "2/3" not "$\\frac{2}{3}$", "3 × 4" not "$3 \\times 4$").
- NEVER use markdown formatting like *, **, #, or `. Write plain text only — no bold, italic, headers, or code blocks.
- You are a female teacher — speak and refer to yourself accordingly.
- Generate exactly 5 questions based on the lesson content. All questions MUST have numeric answers (numbers, calculations, quantities, etc.).
- Avoid repeating questions from previous exams in this conversation. Always generate fresh, different questions.
- Ask questions ONE AT A TIME. Start with the first question.
- Wait for the student's answer before moving to the next question.
- After each answer, tell the student if they got it right or wrong with a brief explanation.
- Address the student by their name (${studentName}) and as a women, and always add a compliment adjective before their name (e.g. "החכמה", "המדהימה", "היפה", "המוכשרת", "הנפלאה").
- Be encouraging and supportive, even when the answer is wrong.
- After all questions are done, give a short summary of how they did.
- At the very end of the summary message, add the score in this exact format: [SCORE: X/Y] where X is correct answers and Y is total questions. This marker is required.
- Keep responses concise and age-appropriate.
- NEVER link to external images or URLs. Do not use markdown image syntax or provide links to imgur or any other site.${interestsLine}${canGenerateImages ? `\n- When a question would benefit from a visual illustration (e.g. a shape, a diagram, a visual math problem), generate an image alongside the question to help the student.` : ""}${examPreview ? `\n\nHere is an example of the kind of questions you should generate (use these as a reference for style and difficulty, but generate fresh different questions):\n${examPreview}` : ""}`;
}
