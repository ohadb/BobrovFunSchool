export type CourseLanguage = "en" | "he";

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
  lessons: Lesson[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCourseInput {
  name: string;
  description: string;
  language: CourseLanguage;
  lessons: Omit<Lesson, "id">[];
}

export interface UpdateCourseInput {
  name?: string;
  description?: string;
  language?: CourseLanguage;
  lessons?: Omit<Lesson, "id">[];
}
