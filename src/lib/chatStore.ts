import { Redis } from "@upstash/redis";
import type { ChatMessage, ChatSession } from "@/types/chat";

const redis = Redis.fromEnv();

function chatKey(courseId: string, lessonId: string): string {
  return `chat:${courseId}:${lessonId}`;
}

export async function getChatSession(
  courseId: string,
  lessonId: string,
): Promise<ChatSession> {
  const key = chatKey(courseId, lessonId);
  const messages = await redis.get<ChatMessage[]>(key);
  return { courseId, lessonId, messages: messages ?? [] };
}

export async function saveChatMessage(
  courseId: string,
  lessonId: string,
  message: ChatMessage,
): Promise<void> {
  const key = chatKey(courseId, lessonId);
  const existing = await redis.get<ChatMessage[]>(key);
  const messages = existing ?? [];
  messages.push(message);
  await redis.set(key, messages);
}

export async function clearChatSession(
  courseId: string,
  lessonId: string,
): Promise<void> {
  const key = chatKey(courseId, lessonId);
  await redis.del(key);
}
