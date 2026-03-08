import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getChatSession, saveChatMessage } from "@/lib/chatStore";
import { getCourseById } from "@/lib/courseStore";
import type { ChatRequestBody, ChatMessage } from "@/types/chat";

const anthropic = new Anthropic();

export async function POST(
  request: Request,
): Promise<NextResponse<ChatMessage | { error: string }>> {
  const body = (await request.json()) as ChatRequestBody;
  const { courseId, lessonId, message, examMode } = body;

  if (!courseId || !lessonId || !message) {
    return NextResponse.json(
      { error: "courseId, lessonId, and message are required" },
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

  const session = await getChatSession(courseId, lessonId);

  const userMessage: ChatMessage = {
    role: "user",
    content: message,
    timestamp: new Date().toISOString(),
  };
  await saveChatMessage(courseId, lessonId, userMessage);

  const isHebrew = course.language === "he";
  const systemPrompt = examMode
    ? buildExamPrompt(
        course.name,
        lesson.title,
        lesson.content,
        lesson.exam?.description ?? "",
        isHebrew,
      )
    : buildSystemPrompt(
        course.name,
        lesson.title,
        lesson.content,
        isHebrew,
      );

  const historyMessages = [
    ...session.messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: message },
  ];

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: systemPrompt,
    messages: historyMessages,
  });

  const assistantContent =
    response.content[0].type === "text" ? response.content[0].text : "";

  const assistantMessage: ChatMessage = {
    role: "assistant",
    content: assistantContent,
    timestamp: new Date().toISOString(),
  };
  await saveChatMessage(courseId, lessonId, assistantMessage);

  return NextResponse.json(assistantMessage);
}

function buildSystemPrompt(
  courseName: string,
  lessonTitle: string,
  lessonContent: string,
  isHebrew: boolean,
): string {
  const lang = isHebrew ? "Hebrew (עברית)" : "English";
  return `You are a friendly, encouraging tutor for kids. You are teaching a lesson from the course "${courseName}".

Current lesson: "${lessonTitle}"
Lesson content: ${lessonContent}

Instructions:
- Respond in ${lang}.
- Teach the lesson content in a fun, age-appropriate way.
- Ask comprehension questions to check understanding.
- Give positive reinforcement and gentle corrections.
- Keep responses concise (2-4 sentences usually).
- If the student seems confused, try explaining differently.
- Stay on topic — focus on this lesson's content.`;
}

function buildExamPrompt(
  courseName: string,
  lessonTitle: string,
  lessonContent: string,
  examDescription: string,
  isHebrew: boolean,
): string {
  const lang = isHebrew ? "Hebrew (עברית)" : "English";
  return `You are a friendly examiner for kids. You are testing a student on a lesson from the course "${courseName}".

Current lesson: "${lessonTitle}"
Lesson content: ${lessonContent}
Exam questions: ${examDescription}

Instructions:
- Respond in ${lang}.
- Ask the exam questions ONE AT A TIME. Start with the first question.
- Wait for the student's answer before moving to the next question.
- After each answer, tell the student if they got it right or wrong with a brief explanation.
- Be encouraging and supportive, even when the answer is wrong.
- After all questions are done, give a short summary of how they did.
- Keep responses concise and age-appropriate.`;
}
