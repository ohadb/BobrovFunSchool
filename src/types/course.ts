export type CourseLanguage = "en" | "he";
export type LlmBackend = "claude" | "gemini";

export interface Exam {
  description: string;
}

export interface Lesson {
  id: string;
  title: string;
  content: string;
  order: number;
  exam?: Exam;
}

export interface Course {
  id: string;
  name: string;
  description: string;
  language: CourseLanguage;
  llmBackend: LlmBackend;
  lessons: Lesson[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCourseInput {
  name: string;
  description: string;
  language: CourseLanguage;
  llmBackend?: LlmBackend;
  lessons: Omit<Lesson, "id">[];
}

export interface UpdateCourseInput {
  name?: string;
  description?: string;
  language?: CourseLanguage;
  llmBackend?: LlmBackend;
  lessons?: Omit<Lesson, "id">[];
}
