import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CourseCard from "@/components/CourseCard";
import type { Course } from "@/types/course";

const mockCourse: Course = {
  id: "test-id-1",
  name: "Fun Math",
  description: "Learn math through games",
  lessons: [
    { id: "lesson-1", title: "Counting", content: "Count to 10", order: 1 },
    { id: "lesson-2", title: "Addition", content: "Add numbers", order: 2 },
  ],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("CourseCard", () => {
  it("renders course name and description", () => {
    render(<CourseCard course={mockCourse} onEdit={jest.fn()} onDelete={jest.fn()} />);

    expect(screen.getByText("Fun Math")).toBeInTheDocument();
    expect(screen.getByText("Learn math through games")).toBeInTheDocument();
  });

  it("shows lesson count", () => {
    render(<CourseCard course={mockCourse} onEdit={jest.fn()} onDelete={jest.fn()} />);

    expect(screen.getByText("2 lessons")).toBeInTheDocument();
  });

  it("shows singular lesson for 1 lesson", () => {
    const singleLessonCourse: Course = {
      ...mockCourse,
      lessons: [mockCourse.lessons[0]],
    };
    render(<CourseCard course={singleLessonCourse} onEdit={jest.fn()} onDelete={jest.fn()} />);

    expect(screen.getByText("1 lesson")).toBeInTheDocument();
  });

  it("lists lesson titles", () => {
    render(<CourseCard course={mockCourse} onEdit={jest.fn()} onDelete={jest.fn()} />);

    expect(screen.getByText("Counting")).toBeInTheDocument();
    expect(screen.getByText("Addition")).toBeInTheDocument();
  });

  it("calls onEdit when Edit button is clicked", async () => {
    const onEdit = jest.fn();
    render(<CourseCard course={mockCourse} onEdit={onEdit} onDelete={jest.fn()} />);

    await userEvent.click(screen.getByText("Edit"));
    expect(onEdit).toHaveBeenCalledWith(mockCourse);
  });

  it("calls onDelete when Delete button is clicked", async () => {
    const onDelete = jest.fn();
    render(<CourseCard course={mockCourse} onEdit={jest.fn()} onDelete={onDelete} />);

    await userEvent.click(screen.getByText("Delete"));
    expect(onDelete).toHaveBeenCalledWith("test-id-1");
  });
});
