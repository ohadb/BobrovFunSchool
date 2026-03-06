import { GET, PUT, DELETE } from "@/app/api/courses/[id]/route";
import { createCourse, resetCourses } from "@/lib/courseStore";
import { NextRequest } from "next/server";

beforeEach(() => {
  resetCourses();
});

function makeParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/courses/[id]", () => {
  it("returns a course by id", async () => {
    const course = createCourse({ name: "Math", description: "desc", language: "en", lessons: [] });
    const request = new NextRequest("http://localhost/api/courses/" + course.id);
    const response = await GET(request, makeParams(course.id));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.name).toBe("Math");
  });

  it("returns 404 for nonexistent course", async () => {
    const request = new NextRequest("http://localhost/api/courses/fake-id");
    const response = await GET(request, makeParams("fake-id"));

    expect(response.status).toBe(404);
  });
});

describe("PUT /api/courses/[id]", () => {
  it("updates a course", async () => {
    const course = createCourse({ name: "Math", description: "old", language: "en", lessons: [] });
    const request = new NextRequest("http://localhost/api/courses/" + course.id, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Updated Math", description: "new" }),
    });

    const response = await PUT(request, makeParams(course.id));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.name).toBe("Updated Math");
    expect(data.description).toBe("new");
  });

  it("returns 404 for nonexistent course", async () => {
    const request = new NextRequest("http://localhost/api/courses/fake-id", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "test" }),
    });

    const response = await PUT(request, makeParams("fake-id"));
    expect(response.status).toBe(404);
  });
});

describe("DELETE /api/courses/[id]", () => {
  it("deletes an existing course", async () => {
    const course = createCourse({ name: "Math", description: "desc", language: "en", lessons: [] });
    const request = new NextRequest("http://localhost/api/courses/" + course.id);
    const response = await DELETE(request, makeParams(course.id));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it("returns 404 for nonexistent course", async () => {
    const request = new NextRequest("http://localhost/api/courses/fake-id");
    const response = await DELETE(request, makeParams("fake-id"));

    expect(response.status).toBe(404);
  });
});
