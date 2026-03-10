import { Redis } from "@upstash/redis";
import type { ChatMessage, ChatSession } from "@/types/chat";

const redis = Redis.fromEnv();

function chatKey(
  studentId: string,
  courseId: string,
  lessonId: string,
): string {
  return `chat:${studentId}:${courseId}:${lessonId}`;
}

export async function getChatSession(
  studentId: string,
  courseId: string,
  lessonId: string,
): Promise<ChatSession> {
  const key = chatKey(studentId, courseId, lessonId);
  const messages = await redis.get<ChatMessage[]>(key);
  return { courseId, lessonId, messages: messages ?? [] };
}

export async function saveChatMessage(
  studentId: string,
  courseId: string,
  lessonId: string,
  message: ChatMessage,
): Promise<void> {
  const key = chatKey(studentId, courseId, lessonId);
  const existing = await redis.get<ChatMessage[]>(key);
  const messages = existing ?? [];
  messages.push(message);
  await redis.set(key, messages);
}

export async function removeLastMessage(
  studentId: string,
  courseId: string,
  lessonId: string,
): Promise<void> {
  const key = chatKey(studentId, courseId, lessonId);
  const existing = await redis.get<ChatMessage[]>(key);
  if (existing && existing.length > 0) {
    existing.pop();
    await redis.set(key, existing);
  }
}

export async function getStudentMessageCountsByDay(
  studentId: string,
): Promise<Record<string, number>> {
  const keys = await redis.keys(`chat:${studentId}:*`);
  const counts: Record<string, number> = {};

  for (const key of keys) {
    const messages = await redis.get<ChatMessage[]>(key);
    if (!messages) continue;
    for (const msg of messages) {
      if (msg.role !== "user") continue;
      const date = msg.timestamp.slice(0, 10);
      counts[date] = (counts[date] ?? 0) + 1;
    }
  }

  return counts;
}

export async function clearChatSession(
  studentId: string,
  courseId: string,
  lessonId: string,
): Promise<void> {
  const key = chatKey(studentId, courseId, lessonId);
  await redis.del(key);
}
