import { Redis } from "@upstash/redis";
import { Course, CreateCourseInput, UpdateCourseInput } from "@/types/course";

const redis = Redis.fromEnv();

const COURSES_KEY = "courses";

function generateId(): string {
  return crypto.randomUUID();
}

async function readCourses(): Promise<Course[]> {
  const data = await redis.get<Course[]>(COURSES_KEY);
  return data ?? [];
}

async function writeCourses(courses: Course[]): Promise<void> {
  await redis.set(COURSES_KEY, courses);
}

export async function getAllCourses(): Promise<Course[]> {
  return readCourses();
}

export async function getCourseById(id: string): Promise<Course | undefined> {
  const courses = await readCourses();
  return courses.find((c) => c.id === id);
}

export async function createCourse(input: CreateCourseInput): Promise<Course> {
  const courses = await readCourses();
  const now = new Date().toISOString();
  const course: Course = {
    id: generateId(),
    name: input.name,
    description: input.description,
    language: input.language,
    llmBackend: input.llmBackend ?? "gemini",
    lessons: input.lessons.map((l) => ({ ...l, id: generateId() })),
    createdAt: now,
    updatedAt: now,
  };
  courses.push(course);
  await writeCourses(courses);
  return course;
}

export async function updateCourse(
  id: string,
  input: UpdateCourseInput,
): Promise<Course | undefined> {
  const courses = await readCourses();
  const index = courses.findIndex((c) => c.id === id);
  if (index === -1) return undefined;

  const existing = courses[index];
  const updated: Course = {
    ...existing,
    name: input.name ?? existing.name,
    description: input.description ?? existing.description,
    language: input.language ?? existing.language,
    llmBackend: input.llmBackend ?? existing.llmBackend ?? "gemini",
    lessons: input.lessons
      ? input.lessons.map((l) => ({ ...l, id: l.id ?? generateId() }))
      : existing.lessons,
    updatedAt: new Date().toISOString(),
  };
  courses[index] = updated;
  await writeCourses(courses);
  return updated;
}

export async function deleteCourse(id: string): Promise<boolean> {
  const courses = await readCourses();
  const index = courses.findIndex((c) => c.id === id);
  if (index === -1) return false;
  courses.splice(index, 1);
  await writeCourses(courses);
  return true;
}

export async function resetCourses(): Promise<void> {
  await writeCourses([]);
}
