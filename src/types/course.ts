export type CourseLanguage = "en" | "he";
export type LlmBackend = "claude" | "gemini";

export interface Exam {
  description: string;
  preview?: string;
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
  enableImages: boolean;
  lessons: Lesson[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCourseInput {
  name: string;
  description: string;
  language: CourseLanguage;
  llmBackend?: LlmBackend;
  enableImages?: boolean;
  lessons: Omit<Lesson, "id">[];
}

export interface UpdateCourseInput {
  name?: string;
  description?: string;
  language?: CourseLanguage;
  llmBackend?: LlmBackend;
  enableImages?: boolean;
  lessons?: (Omit<Lesson, "id"> & { id?: string })[];
}
