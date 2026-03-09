import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

function usageKey(studentId: string, date: string): string {
  return `usage:${studentId}:${date}`;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function addStudyTime(
  studentId: string,
  seconds: number,
): Promise<void> {
  const key = usageKey(studentId, formatDate(new Date()));
  const current = (await redis.get<number>(key)) ?? 0;
  await redis.set(key, current + seconds);
}

export async function getUsageLast7Days(
  studentId: string,
): Promise<{ date: string; minutes: number }[]> {
  const results: { date: string; minutes: number }[] = [];
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const date = formatDate(d);
    const seconds = (await redis.get<number>(usageKey(studentId, date))) ?? 0;
    results.push({ date, minutes: Math.round(seconds / 60) });
  }

  return results;
}
