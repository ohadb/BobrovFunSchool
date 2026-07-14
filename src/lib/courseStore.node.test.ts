import {
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  resetCourses,
} from "@/lib/courseStore";

beforeEach(async () => {
  await resetCourses();
});

describe("courseStore", () => {
  describe("getAllCourses", () => {
    it("returns empty array when no courses exist", async () => {
      expect(await getAllCourses()).toEqual([]);
    });

    it("returns all created courses", async () => {
      await createCourse({
        name: "Math",
        description: "Math course",
        language: "en",
        lessons: [],
      });
      await createCourse({
        name: "Science",
        description: "Science course",
        language: "he",
        lessons: [],
      });

      const courses = await getAllCourses();
      expect(courses).toHaveLength(2);
      expect(courses[0].name).toBe("Math");
      expect(courses[1].name).toBe("Science");
    });
  });

  describe("createCourse", () => {
    it("creates a course with correct fields", async () => {
      const course = await createCourse({
        name: "Fun Math",
        description: "Learn math through games",
        language: "en",
        lessons: [],
      });

      expect(course.id).toBeDefined();
      expect(course.name).toBe("Fun Math");
      expect(course.description).toBe("Learn math through games");
      expect(course.language).toBe("en");
      expect(course.lessons).toEqual([]);
      expect(course.createdAt).toBeDefined();
      expect(course.updatedAt).toBeDefined();
    });

    it("creates lessons with optional exam", async () => {
      const course = await createCourse({
        name: "Math",
        description: "Math course",
        language: "en",
        lessons: [
          {
            title: "Counting",
            content: "Learn to count",
            order: 1,
            exam: { description: "Count to 100" },
          },
          { title: "Addition", content: "Learn to add", order: 2 },
        ],
      });

      expect(course.lessons[0].exam).toEqual({ description: "Count to 100" });
      expect(course.lessons[1].exam).toBeUndefined();
    });

    it("creates lessons with generated IDs", async () => {
      const course = await createCourse({
        name: "Math",
        description: "Math course",
        language: "en",
        lessons: [
          { title: "Counting", content: "Learn to count", order: 1 },
          { title: "Addition", content: "Learn to add", order: 2 },
        ],
      });

      expect(course.lessons).toHaveLength(2);
      expect(course.lessons[0].id).toBeDefined();
      expect(course.lessons[0].title).toBe("Counting");
      expect(course.lessons[1].title).toBe("Addition");
      expect(course.lessons[0].id).not.toBe(course.lessons[1].id);
    });
  });

  describe("getCourseById", () => {
    it("returns course when found", async () => {
      const created = await createCourse({
        name: "Math",
        description: "desc",
        language: "en",
        lessons: [],
      });
      const found = await getCourseById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
    });

    it("returns undefined when not found", async () => {
      expect(await getCourseById("nonexistent-id")).toBeUndefined();
    });
  });

  describe("updateCourse", () => {
    it("updates course name and description", async () => {
      const created = await createCourse({
        name: "Math",
        description: "old",
        language: "en",
        lessons: [],
      });
      const updated = await updateCourse(created.id, {
        name: "Fun Math",
        description: "new description",
      });

      expect(updated).toBeDefined();
      expect(updated?.name).toBe("Fun Math");
      expect(updated?.description).toBe("new description");
    });

    it("preserves fields not included in update", async () => {
      const created = await createCourse({
        name: "Math",
        description: "desc",
        language: "en",
        lessons: [],
      });
      const updated = await updateCourse(created.id, { name: "New Math" });

      expect(updated?.name).toBe("New Math");
      expect(updated?.description).toBe("desc");
    });

    it("replaces lessons when provided", async () => {
      const created = await createCourse({
        name: "Math",
        description: "desc",
        language: "en",
        lessons: [{ title: "Old Lesson", content: "old", order: 1 }],
      });

      const updated = await updateCourse(created.id, {
        lessons: [{ title: "New Lesson", content: "new", order: 1 }],
      });

      expect(updated?.lessons).toHaveLength(1);
      expect(updated?.lessons[0].title).toBe("New Lesson");
    });

    it("updates the updatedAt timestamp", async () => {
      const created = await createCourse({
        name: "Math",
        description: "desc",
        language: "en",
        lessons: [],
      });
      const updated = await updateCourse(created.id, { name: "Updated" });

      expect(updated?.updatedAt).toBeDefined();
    });

    it("returns undefined for nonexistent course", async () => {
      expect(await updateCourse("fake-id", { name: "test" })).toBeUndefined();
    });
  });

  describe("deleteCourse", () => {
    it("deletes an existing course", async () => {
      const created = await createCourse({
        name: "Math",
        description: "desc",
        language: "en",
        lessons: [],
      });
      const result = await deleteCourse(created.id);

      expect(result).toBe(true);
      expect(await getAllCourses()).toHaveLength(0);
    });

    it("returns false for nonexistent course", async () => {
      expect(await deleteCourse("fake-id")).toBe(false);
    });
  });
});
