import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export interface ExamResult {
  correct: number;
  total: number;
  date: string;
}

function examKey(studentId: string, courseId: string, lessonId: string): string {
  return `exams:${studentId}:${courseId}:${lessonId}`;
}

export async function saveExamResult(
  studentId: string,
  courseId: string,
  lessonId: string,
  correct: number,
  total: number,
): Promise<void> {
  const key = examKey(studentId, courseId, lessonId);
  const existing = (await redis.get<ExamResult[]>(key)) ?? [];
  existing.push({ correct, total, date: new Date().toISOString() });
  await redis.set(key, existing);
}

export async function getExamResults(
  studentId: string,
  courseId: string,
  lessonId: string,
): Promise<ExamResult[]> {
  const key = examKey(studentId, courseId, lessonId);
  return (await redis.get<ExamResult[]>(key)) ?? [];
}
