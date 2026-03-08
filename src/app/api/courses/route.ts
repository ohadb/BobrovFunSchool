import { NextRequest, NextResponse } from "next/server";
import { getAllCourses, createCourse } from "@/lib/courseStore";
import { generateExamQuestions } from "@/lib/generateExam";
import { CreateCourseInput } from "@/types/course";

export async function GET(): Promise<NextResponse> {
  const courses = await getAllCourses();
  return NextResponse.json(courses);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as CreateCourseInput;

  if (!body.name || !body.description) {
    return NextResponse.json(
      { error: "Name and description are required" },
      { status: 400 },
    );
  }

  if (body.language && body.language !== "en" && body.language !== "he") {
    return NextResponse.json(
      { error: "Language must be 'en' or 'he'" },
      { status: 400 },
    );
  }

  const language = body.language ?? "en";
  const lessons = body.lessons ?? [];

  for (const lesson of lessons) {
    if (lesson.exam && !lesson.exam.description.trim()) {
      lesson.exam.description = await generateExamQuestions(
        lesson.title,
        lesson.content,
        language,
      );
    }
  }

  const course = await createCourse({
    name: body.name,
    description: body.description,
    language,
    lessons,
  });

  return NextResponse.json(course, { status: 201 });
}
