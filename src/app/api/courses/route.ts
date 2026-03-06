import { NextRequest, NextResponse } from "next/server";
import { getAllCourses, createCourse } from "@/lib/courseStore";
import { CreateCourseInput } from "@/types/course";

export async function GET(): Promise<NextResponse> {
  const courses = getAllCourses();
  return NextResponse.json(courses);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as CreateCourseInput;

  if (!body.name || !body.description) {
    return NextResponse.json(
      { error: "Name and description are required" },
      { status: 400 }
    );
  }

  const course = createCourse({
    name: body.name,
    description: body.description,
    lessons: body.lessons ?? [],
  });

  return NextResponse.json(course, { status: 201 });
}
