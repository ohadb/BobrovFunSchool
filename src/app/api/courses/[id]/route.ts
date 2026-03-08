import { NextRequest, NextResponse } from "next/server";
import { getCourseById, updateCourse, deleteCourse } from "@/lib/courseStore";
import { generateExamQuestions } from "@/lib/generateExam";
import { UpdateCourseInput } from "@/types/course";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const { id } = await params;
  const course = await getCourseById(id);
  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }
  return NextResponse.json(course);
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const { id } = await params;
  const body = (await request.json()) as UpdateCourseInput;

  if (body.lessons) {
    const existing = await getCourseById(id);
    const language = body.language ?? existing?.language ?? "en";
    for (const lesson of body.lessons) {
      if (lesson.exam && !lesson.exam.description.trim()) {
        lesson.exam.description = await generateExamQuestions(
          lesson.title,
          lesson.content,
          language,
        );
      }
    }
  }

  const updated = await updateCourse(id, body);
  if (!updated) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const { id } = await params;
  const deleted = await deleteCourse(id);
  if (!deleted) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
