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

  const allMessages = [
    ...session.messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: message },
  ];

  let historyMessages: { role: "user" | "assistant"; content: string }[];
  if (examMode && allMessages.length > 1) {
    // Condense prior Q&A into a summary to keep the request small and fast.
    const prior = allMessages.slice(0, -1);
    const summary = prior.map((m) => `${m.role === "user" ? "Student" : "Teacher"}: ${m.content}`).join("\n");
    historyMessages = [
      { role: "user", content: `Conversation so far:\n${summary}\n\nStudent's latest message: ${message}` },
    ];
  } else {
    historyMessages = allMessages;
  }

  const enableImages = canGenerateImages;
  const mode = examMode ? "exam" : "lesson";
  console.log(`[chat] ${mode} start: backend=${backend} lesson="${lesson.title}" historyLen=${historyMessages.length}`);

  const llmStart = Date.now();
  let llmResult;
  const maxRetries = 2;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      llmResult = await chatCompletion(
        backend,
        systemPrompt,
        historyMessages,
        enableImages,
      );
      break;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const is503 = msg.includes("503") || msg.includes("UNAVAILABLE") || msg.includes("high demand");
      console.error(`[chat] ${mode} attempt ${attempt}/${maxRetries} failed: ${msg}`);
      if (!is503 || attempt === maxRetries) {
        return NextResponse.json(
          { error: `LLM failed: ${msg}` },
          { status: 502 },
        );
      }
      console.log(`[chat] ${mode} retrying in 2s...`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  const llmMs = Date.now() - llmStart;
  console.log(`[chat] ${mode} LLM took ${llmMs}ms (${backend}, images=${enableImages}, generatedImages=${llmResult!.images.length})`);

  const result = llmResult!;
  const imageIds: string[] = [];
  if (result.images.length > 0) {
    const imgStart = Date.now();
    for (const img of result.images) {
      const sizeKB = Math.round((img.base64.length * 3) / 4 / 1024);
      console.log(`[chat] ${mode} image: ${img.mimeType}, ~${sizeKB}KB`);
      const id = await saveImage(img.base64, img.mimeType);
      imageIds.push(id);
    }
    console.log(`[chat] ${mode} saving ${imageIds.length} images took ${Date.now() - imgStart}ms`);
  }

  const totalMs = Date.now() - llmStart;
  console.log(`[chat] ${mode} total: ${totalMs}ms debug=${result.debug}`);

  const cleanText = stripMarkdown(result.text);

  const assistantMessage: ChatMessage = {
    role: "assistant",
    content: cleanText,
    ...(imageIds.length > 0 ? { images: imageIds } : {}),
    timestamp: new Date().toISOString(),
  };
  await saveChatMessage(studentId, courseId, lessonId, assistantMessage);

  if (examMode) {
    const scoreMatch = cleanText.match(/\[SCORE:\s*(\d+)\/(\d+)\]/);
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

  return NextResponse.json({ ...assistantMessage, llmDebug: result.debug });
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
- NEVER use markdown formatting like *, **, #, or backticks. Write plain text only — no bold, italic, headers, or code blocks.
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
- NEVER link to external images or URLs. Do not use markdown image syntax or provide links to imgur or any other site.${interestsLine}${canGenerateImages ? `\n- When explaining a concept that would benefit from a visual illustration (diagrams, shapes, charts, visual math problems, etc.), generate an image to help the student understand. Only generate images when a visual truly aids comprehension — not for every response. Image style: minimalist 2D icon, clean background, low-fidelity sketch style.` : ""}`;
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
- NEVER use markdown formatting like *, **, #, or backticks. Write plain text only — no bold, italic, headers, or code blocks.
- You are a female teacher — speak and refer to yourself accordingly.
- The exam has 5 questions total. Each question MUST have a numeric answer (numbers, calculations, quantities, etc.).
- IMPORTANT: Generate ONLY ONE question per response. Look at the conversation history to determine which question number you are on.
- If this is the start of the exam, greet the student and ask question 1.
- If the student just answered a question, tell them if they got it right or wrong with a brief explanation, then ask the next question.
- If the student asks to replace the question (e.g. "אני רוצה שאלה אחרת בבקשה"), do NOT advance to the next question. Instead, replace the current question with a completely different question on the same question number. Do not count the replaced question as answered.
- After the student answers question 5, give a short summary and add the score in this exact format: [SCORE: X/Y] where X is correct answers and Y is total questions.
- Each question should be different and cover different aspects of the lesson content.
- Address the student by their name (${studentName}) and as a women, and always add a compliment adjective before their name (e.g. "החכמה", "המדהימה", "היפה", "המוכשרת", "הנפלאה").
- Be encouraging and supportive, even when the answer is wrong.
- Keep responses concise and age-appropriate.
- NEVER link to external images or URLs. Do not use markdown image syntax or provide links to imgur or any other site.${interestsLine}${canGenerateImages ? `\n- When a question would benefit from a visual illustration (e.g. a shape, a diagram, a visual math problem), generate an image alongside the question to help the student. Image style: minimalist 2D icon, clean background, low-fidelity sketch style.` : ""}${examPreview ? `\n\nHere is an example of the kind of questions you should generate (use these as a reference for style and difficulty, but generate fresh different questions):\n${examPreview}` : ""}`;
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")   // **bold** → bold
    .replace(/\*(.+?)\*/g, "$1")        // *italic* → italic
    .replace(/__(.+?)__/g, "$1")        // __bold__ → bold
    .replace(/_(.+?)_/g, "$1")          // _italic_ → italic
    .replace(/^#{1,6}\s+/gm, "")        // # headers → plain text
    .replace(/`([^`]+)`/g, "$1")        // `code` → code
    .replace(/\$\$(.+?)\$\$/g, "$1")    // $$latex$$ → plain
    .replace(/\$(.+?)\$/g, "$1")        // $latex$ → plain
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "$1/$2")  // \frac{a}{b} → a/b
    .replace(/\\times/g, "×")
    .replace(/\\div/g, "÷")
    .replace(/\\cdot/g, "·")
    .replace(/\\left|\\right/g, "")
    .replace(/\\\\/g, "");
}
