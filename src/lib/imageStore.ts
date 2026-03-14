import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

const IMAGE_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

export async function saveImage(
  base64: string,
  mimeType: string,
): Promise<string> {
  const id = crypto.randomUUID();
  const key = `img:${id}`;
  await redis.set(key, JSON.stringify({ base64, mimeType }), {
    ex: IMAGE_TTL_SECONDS,
  });
  return id;
}

export async function getImage(
  id: string,
): Promise<{ base64: string; mimeType: string } | null> {
  const data = await redis.get<{ base64: string; mimeType: string }>(
    `img:${id}`,
  );
  return data ?? null;
}
