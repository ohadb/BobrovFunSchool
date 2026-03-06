import { GET, POST } from "@/app/api/courses/route";
import { resetCourses } from "@/lib/courseStore";

beforeEach(() => {
  resetCourses();
});

describe("GET /api/courses", () => {
  it("returns empty array when no courses exist", async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual([]);
  });

  it("returns created courses", async () => {
    const createReq = new Request("http://localhost/api/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Math", description: "Math course", language: "en", lessons: [] }),
    });
    await POST(createReq);

    const response = await GET();
    const data = await response.json();

    expect(data).toHaveLength(1);
    expect(data[0].name).toBe("Math");
  });
});

describe("POST /api/courses", () => {
  it("creates a course successfully", async () => {
    const request = new Request("http://localhost/api/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Fun Math",
        description: "Learn math",
        language: "he",
        lessons: [{ title: "Counting", content: "1 to 10", order: 1 }],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.name).toBe("Fun Math");
    expect(data.language).toBe("he");
    expect(data.lessons).toHaveLength(1);
    expect(data.id).toBeDefined();
  });

  it("returns 400 when name is missing", async () => {
    const request = new Request("http://localhost/api/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: "no name" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("returns 400 when description is missing", async () => {
    const request = new Request("http://localhost/api/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Math" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("defaults to empty lessons when not provided", async () => {
    const request = new Request("http://localhost/api/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Math", description: "desc" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.language).toBe("en");
    expect(data.lessons).toEqual([]);
  });

  it("returns 400 for invalid language", async () => {
    const request = new Request("http://localhost/api/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Math", description: "desc", language: "fr" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
