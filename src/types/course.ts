export interface Lesson {
  id: string;
  title: string;
  content: string;
  order: number;
}

export interface Course {
  id: string;
  name: string;
  description: string;
  lessons: Lesson[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCourseInput {
  name: string;
  description: string;
  lessons: Omit<Lesson, "id">[];
}

export interface UpdateCourseInput {
  name?: string;
  description?: string;
  lessons?: Omit<Lesson, "id">[];
}
