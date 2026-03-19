/**
 * Test script: generates an exam preview for a specific lesson and summarizes the output.
 *
 * Usage:
 *   npx tsx scripts/test-exam-preview.ts [lessonId]
 *
 * Defaults to lesson 86b364da-8af3-4731-a8a9-9dbdab174420 (גיאומטריה / תרגול מושגים בגאומטריה)
 */

const BASE_URL = process.env.BASE_URL ?? "https://bobrov-fun-school.vercel.app";
const LESSON_ID = process.argv[2] ?? "86b364da-8af3-4731-a8a9-9dbdab174420";

interface Lesson {
  id: string;
  title: string;
  content: string;
  order: number;
  exam?: { description?: string; preview?: string };
}

interface Course {
  id: string;
  name: string;
  language: string;
  llmBackend?: string;
  lessons: Lesson[];
}

interface QuestionResult {
  questionNum: number;
  status: "ok" | "error";
  httpStatus: number;
  durationMs: number;
  text: string;
  images: string[];
  error?: string;
}

async function findLesson(): Promise<{ course: Course; lesson: Lesson }> {
  const res = await fetch(`${BASE_URL}/api/courses`);
  if (!res.ok) throw new Error(`Failed to fetch courses: ${res.status}`);
  const courses = (await res.json()) as Course[];
  for (const course of courses) {
    const lesson = course.lessons.find((l) => l.id === LESSON_ID);
    if (lesson) return { course, lesson };
  }
  throw new Error(`Lesson ${LESSON_ID} not found in any course`);
}

async function fetchQuestion(
  baseBody: Record<string, unknown>,
  questionNum: number,
): Promise<QuestionResult> {
  const start = Date.now();
  try {
    const res = await fetch(`${BASE_URL}/api/exam-preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...baseBody, questionNum }),
    });
    const durationMs = Date.now() - start;
    if (!res.ok) {
      const errText = await res.text();
      return { questionNum, status: "error", httpStatus: res.status, durationMs, text: "", images: [], error: errText };
    }
    const payload = (await res.json()) as { index: number; text: string; images: string[] };
    return { questionNum, status: "ok", httpStatus: res.status, durationMs, text: payload.text, images: payload.images };
  } catch (err) {
    const durationMs = Date.now() - start;
    return { questionNum, status: "error", httpStatus: 0, durationMs, text: "", images: [], error: String(err) };
  }
}

async function run(): Promise<void> {
  console.log(`Looking for lesson ${LESSON_ID} on ${BASE_URL}...\n`);
  const { course, lesson } = await findLesson();

  console.log(`Course: "${course.name}" (language: ${course.language}, backend: ${course.llmBackend ?? "gemini"})`);
  console.log(`Lesson: "${lesson.title}"`);
  console.log(`Content: ${lesson.content}`);
  console.log();

  const baseBody = {
    courseName: course.name,
    lessonTitle: lesson.title,
    lessonContent: lesson.content,
    language: course.language,
    llmBackend: course.llmBackend ?? "gemini",
  };

  console.log(`Generating 5 questions...\n`);
  const totalStart = Date.now();
  const results = await Promise.all(
    [1, 2, 3, 4, 5].map(async (q, i) => {
      if (i > 0) await new Promise((r) => setTimeout(r, i * 200));
      return fetchQuestion(baseBody, q);
    }),
  );
  const totalMs = Date.now() - totalStart;

  results.sort((a, b) => a.questionNum - b.questionNum);

  // Summary table
  console.log(`  # | Status | HTTP | Duration | Images | Text`);
  console.log(`  ${"-".repeat(80)}`);
  for (const r of results) {
    const textPreview = r.text ? r.text.slice(0, 60).replace(/\n/g, " ") : r.error?.slice(0, 60) ?? "(empty)";
    const imgCount = `${r.images.length} img`;
    console.log(`  ${r.questionNum} | ${r.status.padEnd(5)} | ${String(r.httpStatus).padEnd(3)}  | ${String(r.durationMs + "ms").padEnd(8)} | ${imgCount.padEnd(6)} | ${textPreview}`);
  }

  const okCount = results.filter((r) => r.status === "ok").length;
  const errCount = results.filter((r) => r.status === "error").length;
  const emptyTextCount = results.filter((r) => r.status === "ok" && !r.text.trim()).length;
  const totalImages = results.reduce((sum, r) => sum + r.images.length, 0);
  const avgDuration = Math.round(results.reduce((sum, r) => sum + r.durationMs, 0) / results.length);

  console.log(`\n  Summary:`);
  console.log(`    OK: ${okCount}/5 | Errors: ${errCount}/5 | Empty text: ${emptyTextCount}/5`);
  console.log(`    Total images: ${totalImages} | Avg duration: ${avgDuration}ms | Total: ${totalMs}ms`);

  if (emptyTextCount > 0) {
    console.log(`    WARNING: ${emptyTextCount} question(s) returned no text!`);
  }
  if (errCount > 0) {
    console.log(`    WARNING: ${errCount} question(s) failed!`);
    for (const r of results.filter((r) => r.status === "error")) {
      console.log(`      Q${r.questionNum}: ${r.error}`);
    }
  }

  // Full responses
  console.log(`\n  Full responses:`);
  for (const r of results) {
    console.log(`\n  --- Q${r.questionNum} (${r.durationMs}ms, ${r.images.length} images) ---`);
    console.log(`  ${r.text || "(no text)"}`);
    if (r.images.length > 0) {
      for (const imgId of r.images) {
        console.log(`  Image: ${BASE_URL}/api/image/${imgId}`);
      }
    }
  }
  console.log();
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
