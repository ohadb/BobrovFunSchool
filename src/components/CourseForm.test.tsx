import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CourseForm from "@/components/CourseForm";
import type { Course } from "@/types/course";

describe("CourseForm", () => {
  it("renders empty form for creating a new course", () => {
    render(<CourseForm onSave={jest.fn()} onCancel={jest.fn()} />);

    expect(screen.getByPlaceholderText("e.g. Fun with Math")).toHaveValue("");
    expect(screen.getByPlaceholderText("What will this course teach?")).toHaveValue("");
    expect(screen.getByText("Create Course")).toBeInTheDocument();
  });

  it("renders pre-filled form when editing a course", () => {
    const course: Course = {
      id: "test-id",
      name: "Fun Math",
      description: "Math is fun",
      lessons: [{ id: "l1", title: "Counting", content: "Learn counting", order: 1 }],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    render(<CourseForm course={course} onSave={jest.fn()} onCancel={jest.fn()} />);

    expect(screen.getByDisplayValue("Fun Math")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Math is fun")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Counting")).toBeInTheDocument();
    expect(screen.getByText("Update Course")).toBeInTheDocument();
  });

  it("calls onCancel when Cancel is clicked", async () => {
    const onCancel = jest.fn();
    render(<CourseForm onSave={jest.fn()} onCancel={onCancel} />);

    await userEvent.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalled();
  });

  it("adds a lesson when + Add Lesson is clicked", async () => {
    render(<CourseForm onSave={jest.fn()} onCancel={jest.fn()} />);

    await userEvent.click(screen.getByText("+ Add Lesson"));
    expect(screen.getByText("Lesson 1")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Lesson title")).toBeInTheDocument();
  });

  it("removes a lesson when Remove is clicked", async () => {
    render(<CourseForm onSave={jest.fn()} onCancel={jest.fn()} />);

    await userEvent.click(screen.getByText("+ Add Lesson"));
    expect(screen.getByText("Lesson 1")).toBeInTheDocument();

    await userEvent.click(screen.getByText("Remove"));
    expect(screen.queryByText("Lesson 1")).not.toBeInTheDocument();
  });

  it("calls onSave with form data on submit", async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);
    render(<CourseForm onSave={onSave} onCancel={jest.fn()} />);

    await userEvent.type(screen.getByPlaceholderText("e.g. Fun with Math"), "Science");
    await userEvent.type(screen.getByPlaceholderText("What will this course teach?"), "Fun science");
    await userEvent.click(screen.getByText("Create Course"));

    expect(onSave).toHaveBeenCalledWith({
      name: "Science",
      description: "Fun science",
      lessons: [],
    });
  });
});
