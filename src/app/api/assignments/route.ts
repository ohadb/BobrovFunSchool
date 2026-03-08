import { NextRequest, NextResponse } from "next/server";
import {
  getAssignments,
  assignCourse,
  unassignCourse,
} from "@/lib/assignmentStore";

export async function GET(
  request: NextRequest,
): Promise<NextResponse<string[] | { error: string }>> {
  const studentId = request.nextUrl.searchParams.get("studentId");
  if (!studentId) {
    return NextResponse.json(
      { error: "studentId is required" },
      { status: 400 },
    );
  }
  const assignments = await getAssignments(studentId);
  return NextResponse.json(assignments);
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<{ success: boolean } | { error: string }>> {
  const body = (await request.json()) as {
    studentId: string;
    courseId: string;
  };
  if (!body.studentId || !body.courseId) {
    return NextResponse.json(
      { error: "studentId and courseId are required" },
      { status: 400 },
    );
  }
  await assignCourse(body.studentId, body.courseId);
  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
): Promise<NextResponse<{ success: boolean } | { error: string }>> {
  const body = (await request.json()) as {
    studentId: string;
    courseId: string;
  };
  if (!body.studentId || !body.courseId) {
    return NextResponse.json(
      { error: "studentId and courseId are required" },
      { status: 400 },
    );
  }
  await unassignCourse(body.studentId, body.courseId);
  return NextResponse.json({ success: true });
}
