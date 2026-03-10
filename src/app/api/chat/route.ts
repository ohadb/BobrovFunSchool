import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getChatSession, saveChatMessage } from "@/lib/chatStore";
import { getCourseById } from "@/lib/courseStore";
import { saveExamResult } from "@/lib/examResultStore";
import { getInterests } from "@/lib/interestsStore";
import type { ChatRequestBody, ChatMessage } from "@/types/chat";

const anthropic = new Anthropic();

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
  const systemPrompt = examMode
    ? buildExamPrompt(
        course.name,
        lesson.title,
        lesson.content,
        studentName,
        isHebrew,
        interests,
      )
    : buildSystemPrompt(
        course.name,
        lesson.title,
        lesson.content,
        studentName,
        isHebrew,
        interests,
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
  await saveChatMessage(studentId, courseId, lessonId, assistantMessage);

  if (examMode) {
    const scoreMatch = assistantContent.match(/\[SCORE:\s*(\d+)\/(\d+)\]/);
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

  return NextResponse.json(assistantMessage);
}

function buildSystemPrompt(
  courseName: string,
  lessonTitle: string,
  lessonContent: string,
  studentName: string,
  isHebrew: boolean,
  interests: string[],
): string {
  const lang = isHebrew ? "Hebrew (עברית)" : "English";
  const interestsLine =
    interests.length > 0
      ? `\n- The student has the following topics of interest: ${interests.join(", ")}. Whenever possible, use examples, analogies, and questions related to these topics to make the lesson more engaging and relatable.`
      : "";
  return `You are a friendly, encouraging tutor for kids. You are teaching a lesson from the course "${courseName}".
The student's name is ${studentName}.

Current lesson: "${lessonTitle}"
Lesson content: ${lessonContent}

Instructions:
- Respond in ${lang}.
- Address the student by their name (${studentName}) and as a women.
- Greet them warmly by name when starting the lesson.
- Teach the lesson content in a fun, age-appropriate way.
- Ask comprehension questions to check understanding.
- Give positive reinforcement and gentle corrections.
- Keep responses concise (2-4 sentences usually).
- If the student seems confused, try explaining differently.
- Be funny when possible — use humor to make learning enjoyable.
- Stay on topic — focus on this lesson's content.${interestsLine}`;
}

function buildExamPrompt(
  courseName: string,
  lessonTitle: string,
  lessonContent: string,
  studentName: string,
  isHebrew: boolean,
  interests: string[],
): string {
  const lang = isHebrew ? "Hebrew (עברית)" : "English";
  const interestsLine =
    interests.length > 0
      ? `\n- The student has the following topics of interest: ${interests.join(", ")}. Whenever possible, frame questions using scenarios or examples related to these topics.`
      : "";
  return `You are a friendly examiner for kids. You are testing a student named ${studentName} on a lesson from the course "${courseName}".

Current lesson: "${lessonTitle}"
Lesson content: ${lessonContent}

Instructions:
- Respond in ${lang}.
- Generate 3-5 questions based on the lesson content. All questions MUST have numeric answers (numbers, calculations, quantities, etc.).
- Avoid repeating questions from previous exams in this conversation. Always generate fresh, different questions.
- Ask questions ONE AT A TIME. Start with the first question.
- Wait for the student's answer before moving to the next question.
- After each answer, tell the student if they got it right or wrong with a brief explanation.
- Address the student by their name (${studentName}) and as a women.
- Be encouraging and supportive, even when the answer is wrong.
- After all questions are done, give a short summary of how they did.
- At the very end of the summary message, add the score in this exact format: [SCORE: X/Y] where X is correct answers and Y is total questions. This marker is required.
- Keep responses concise and age-appropriate.${interestsLine}`;
}
