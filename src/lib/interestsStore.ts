import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

function interestsKey(studentId: string): string {
  return `interests:${studentId}`;
}

export async function getInterests(studentId: string): Promise<string[]> {
  const data = await redis.get<string[]>(interestsKey(studentId));
  return data ?? [];
}

export async function setInterests(
  studentId: string,
  interests: string[],
): Promise<void> {
  await redis.set(interestsKey(studentId), interests);
}
