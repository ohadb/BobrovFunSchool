"use client";

import { useState } from "react";
import type { Course, CourseLanguage, Exam } from "@/types/course";

interface LessonInput {
  title: string;
  content: string;
  order: number;
  exam?: Exam;
}

interface CourseFormProps {
  course?: Course;
  onSave: (data: {
    name: string;
    description: string;
    language: CourseLanguage;
    lessons: LessonInput[];
  }) => Promise<void>;
  onCancel: () => void;
}

export default function CourseForm({
  course,
  onSave,
  onCancel,
}: CourseFormProps): React.ReactElement {
  const [name, setName] = useState(course?.name ?? "");
  const [description, setDescription] = useState(course?.description ?? "");
  const [language, setLanguage] = useState<CourseLanguage>(
    course?.language ?? "he",
  );
  const [lessons, setLessons] = useState<LessonInput[]>(
    course?.lessons.map((l) => ({
      title: l.title,
      content: l.content,
      order: l.order,
      exam: l.exam,
    })) ?? [],
  );
  const [saving, setSaving] = useState(false);
  const [examPreview, setExamPreview] = useState<Record<number, string>>({});
  const [loadingPreview, setLoadingPreview] = useState<Record<number, boolean>>(
    {},
  );

  const addLesson = (): void => {
    setLessons([
      ...lessons,
      { title: "", content: "", order: lessons.length + 1 },
    ]);
  };

  const updateLesson = (
    index: number,
    field: keyof LessonInput,
    value: string | number,
  ): void => {
    const updated = [...lessons];
    updated[index] = { ...updated[index], [field]: value };
    setLessons(updated);
  };

  const toggleExam = (index: number): void => {
    const updated = [...lessons];
    if (updated[index].exam) {
      const { exam: _, ...rest } = updated[index];
      updated[index] = rest as LessonInput;
      setExamPreview((prev) => {
        const next = { ...prev };
        delete next[index];
        return next;
      });
    } else {
      updated[index] = { ...updated[index], exam: { description: "" } };
      generateExamPreview(index, updated[index]);
    }
    setLessons(updated);
  };

  const generateExamPreview = async (
    index: number,
    lesson: LessonInput,
  ): Promise<void> => {
    if (!lesson.title && !lesson.content) {
      setExamPreview((prev) => ({
        ...prev,
        [index]: "Add lesson title and content first to see an exam preview.",
      }));
      return;
    }
    setLoadingPreview((prev) => ({ ...prev, [index]: true }));
    try {
      const res = await fetch("/api/exam-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseName: name,
          lessonTitle: lesson.title,
          lessonContent: lesson.content,
          language,
        }),
      });
      const data = (await res.json()) as { preview: string };
      setExamPreview((prev) => ({ ...prev, [index]: data.preview }));
    } catch {
      setExamPreview((prev) => ({
        ...prev,
        [index]: "Failed to generate preview.",
      }));
    }
    setLoadingPreview((prev) => ({ ...prev, [index]: false }));
  };

  const updateExamDescription = (index: number, description: string): void => {
    const updated = [...lessons];
    updated[index] = { ...updated[index], exam: { description } };
    setLessons(updated);
  };

  const removeLesson = (index: number): void => {
    if (!window.confirm("Are you sure you want to delete this lesson?")) return;
    setLessons(
      lessons
        .filter((_, i) => i !== index)
        .map((l, i) => ({ ...l, order: i + 1 })),
    );
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setSaving(true);
    await onSave({ name, description, language, lessons });
    setSaving(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
    >
      <div>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
          Course Name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Fun with Math"
          required
        />
      </div>

      <div>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What will this course teach?"
          rows={3}
          required
        />
      </div>

      <div>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
          Language
        </label>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as CourseLanguage)}
          style={{
            width: "100%",
            padding: "10px 12px",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            fontSize: 14,
            fontFamily: "inherit",
            background: "white",
          }}
        >
          <option value="en">English</option>
          <option value="he">Hebrew (עברית)</option>
        </select>
      </div>

      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <label style={{ fontWeight: 500 }}>Lessons</label>
          <button type="button" className="secondary" onClick={addLesson}>
            + Add Lesson
          </button>
        </div>

        {lessons.length === 0 && (
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
            No lessons yet. Add lessons after creating the course, or click
            &quot;+ Add Lesson&quot; above.
          </p>
        )}

        {lessons.map((lesson, index) => (
          <div
            key={index}
            style={{
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: 12,
              marginBottom: 8,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                Lesson {lesson.order}
              </span>
              <button
                type="button"
                className="danger"
                style={{ padding: "4px 8px", fontSize: 12 }}
                onClick={() => removeLesson(index)}
              >
                Remove
              </button>
            </div>
            <input
              value={lesson.title}
              onChange={(e) => updateLesson(index, "title", e.target.value)}
              placeholder="Lesson title"
              style={{ marginBottom: 8 }}
              required
            />
            <textarea
              value={lesson.content}
              onChange={(e) => updateLesson(index, "content", e.target.value)}
              placeholder="Lesson content"
              rows={2}
            />
            <div style={{ marginTop: 8 }}>
              <button
                type="button"
                className="secondary"
                style={{ padding: "4px 8px", fontSize: 12 }}
                onClick={() => toggleExam(index)}
              >
                {lesson.exam ? "Remove Exam" : "+ Add Exam"}
              </button>
              {lesson.exam && (
                <>
                  <textarea
                    value={lesson.exam.description}
                    onChange={(e) =>
                      updateExamDescription(index, e.target.value)
                    }
                    placeholder="Exam description (optional)"
                    rows={2}
                    style={{ marginTop: 8 }}
                  />
                  {loadingPreview[index] && (
                    <p
                      style={{
                        fontSize: 12,
                        color: "var(--text-muted)",
                        marginTop: 8,
                      }}
                    >
                      Generating exam preview...
                    </p>
                  )}
                  {examPreview[index] && !loadingPreview[index] && (
                    <div
                      dir={language === "he" ? "rtl" : "ltr"}
                      style={{
                        marginTop: 8,
                        padding: 12,
                        background: "#f0f4ff",
                        border: "1px solid #c7d2fe",
                        borderRadius: 6,
                        fontSize: 13,
                        lineHeight: 1.6,
                        whiteSpace: "pre-wrap",
                        color: "var(--text)",
                      }}
                    >
                      <strong style={{ fontSize: 12, color: "var(--primary)" }}>
                        Exam Preview:
                      </strong>
                      <br />
                      {examPreview[index]}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" className="primary" disabled={saving}>
          {saving ? "Saving..." : course ? "Update Course" : "Create Course"}
        </button>
        <button type="button" className="secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
