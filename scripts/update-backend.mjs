import { Redis } from "@upstash/redis";
import { readFileSync } from "fs";

const envFile = readFileSync(".env.local", "utf8");
for (const line of envFile.split("\n")) {
  const match = line.match(/^(\w+)="?([^"]*)"?$/);
  if (match) process.env[match[1]] = match[2];
}
process.env.UPSTASH_REDIS_REST_URL = process.env.KV_REST_API_URL;
process.env.UPSTASH_REDIS_REST_TOKEN = process.env.KV_REST_API_TOKEN;

const redis = Redis.fromEnv();

const courses = await redis.get("courses");
if (!courses) { console.log("No courses found"); process.exit(0); }
for (const c of courses) console.log(c.name + " -> " + (c.llmBackend || "not set"));
for (const c of courses) c.llmBackend = "gemini";
await redis.set("courses", courses);
console.log("Done - all courses set to gemini.");
