import {
  Course,
  CreateCourseInput,
  UpdateCourseInput,
  Lesson,
} from "@/types/course";

let courses: Course[] = [];

function generateId(): string {
  return crypto.randomUUID();
}

export function getAllCourses(): Course[] {
  return courses;
}

export function getCourseById(id: string): Course | undefined {
  return courses.find((c) => c.id === id);
}

export function createCourse(input: CreateCourseInput): Course {
  const now = new Date().toISOString();
  const course: Course = {
    id: generateId(),
    name: input.name,
    description: input.description,
    language: input.language,
    lessons: input.lessons.map((l) => ({ ...l, id: generateId() })),
    createdAt: now,
    updatedAt: now,
  };
  courses.push(course);
  return course;
}

export function updateCourse(
  id: string,
  input: UpdateCourseInput,
): Course | undefined {
  const index = courses.findIndex((c) => c.id === id);
  if (index === -1) return undefined;

  const existing = courses[index];
  const updated: Course = {
    ...existing,
    name: input.name ?? existing.name,
    description: input.description ?? existing.description,
    language: input.language ?? existing.language,
    lessons: input.lessons
      ? input.lessons.map((l) => ({ ...l, id: generateId() }))
      : existing.lessons,
    updatedAt: new Date().toISOString(),
  };
  courses[index] = updated;
  return updated;
}

export function deleteCourse(id: string): boolean {
  const index = courses.findIndex((c) => c.id === id);
  if (index === -1) return false;
  courses.splice(index, 1);
  return true;
}

export function resetCourses(): void {
  courses = [];
}
