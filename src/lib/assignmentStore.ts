import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

function assignmentKey(studentId: string): string {
  return `assignments:${studentId}`;
}

export async function getAssignments(studentId: string): Promise<string[]> {
  const data = await redis.get<string[]>(assignmentKey(studentId));
  return data ?? [];
}

export async function assignCourse(
  studentId: string,
  courseId: string,
): Promise<void> {
  const current = await getAssignments(studentId);
  if (!current.includes(courseId)) {
    current.push(courseId);
    await redis.set(assignmentKey(studentId), current);
  }
}

export async function unassignCourse(
  studentId: string,
  courseId: string,
): Promise<void> {
  const current = await getAssignments(studentId);
  const updated = current.filter((id) => id !== courseId);
  await redis.set(assignmentKey(studentId), updated);
}
