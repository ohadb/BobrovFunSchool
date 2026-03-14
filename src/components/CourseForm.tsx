"use client";

import { useState } from "react";
import type { Course, CourseLanguage, LlmBackend, Exam } from "@/types/course";

interface LessonInput {
  id?: string;
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
    llmBackend: LlmBackend;
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
  const [llmBackend, setLlmBackend] = useState<LlmBackend>(
    course?.llmBackend ?? "gemini",
  );
  const [lessons, setLessons] = useState<LessonInput[]>(
    course?.lessons.map((l) => ({
      id: l.id,
      title: l.title,
      content: l.content,
      order: l.order,
      exam: l.exam,
    })) ?? [],
  );
  const [saving, setSaving] = useState(false);
  const [examPreview, setExamPreview] = useState<Record<number, string>>(
    () => {
      const initial: Record<number, string> = {};
      course?.lessons.forEach((l, i) => {
        if (l.exam?.preview) initial[i] = l.exam.preview;
      });
      return initial;
    },
  );
  const [examFeedback, setExamFeedback] = useState<Record<number, string>>({});
  const [loadingPreview, setLoadingPreview] = useState<Record<number, boolean>>(
    {},
  );
  const [previewCollapsed, setPreviewCollapsed] = useState<Record<number, boolean>>(
    () => {
      const initial: Record<number, boolean> = {};
      course?.lessons.forEach((l, i) => {
        if (l.exam?.preview) initial[i] = true;
      });
      return initial;
    },
  );

  const addLesson = (): void => {
    setLessons([
      ...lessons,
      { id: crypto.randomUUID(), title: "", content: "", order: lessons.length + 1 },
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
          llmBackend,
        }),
      });
      const data = (await res.json()) as { preview: string };
      setExamPreview((prev) => ({ ...prev, [index]: data.preview }));
      setPreviewCollapsed((prev) => ({ ...prev, [index]: true }));
    } catch {
      setExamPreview((prev) => ({
        ...prev,
        [index]: "Failed to generate preview.",
      }));
    }
    setLoadingPreview((prev) => ({ ...prev, [index]: false }));
  };

  const applyFeedback = async (index: number): Promise<void> => {
    const feedback = (examFeedback[index] ?? "").trim();
    if (!feedback || !examPreview[index]) return;
    const lesson = lessons[index];
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
          llmBackend,
          currentPreview: examPreview[index],
          feedback,
        }),
      });
      const data = (await res.json()) as { preview: string };
      setExamPreview((prev) => ({ ...prev, [index]: data.preview }));
      setPreviewCollapsed((prev) => ({ ...prev, [index]: true }));
      setExamFeedback((prev) => ({ ...prev, [index]: "" }));
    } catch {
      // keep current preview
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
    const lessonsWithPreview = lessons.map((l, i) => ({
      ...l,
      exam: l.exam
        ? { ...l.exam, preview: examPreview[i] ?? l.exam.preview ?? "" }
        : undefined,
    }));
    await onSave({ name, description, language, llmBackend, lessons: lessonsWithPreview });
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
        <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
          LLM Backend
        </label>
        <select
          value={llmBackend}
          onChange={(e) => setLlmBackend(e.target.value as LlmBackend)}
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
          <option value="claude">Claude (Anthropic)</option>
          <option value="gemini">Gemini (Google)</option>
        </select>
      </div>

      <div>
        <label style={{ fontWeight: 500, display: "block", marginBottom: 8 }}>Lessons</label>

        {lessons.length === 0 && (
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
            No lessons yet. Click &quot;+ Add Lesson&quot; below to add
            lessons.
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
                Lesson {lesson.order}{lesson.id && <span style={{ fontSize: 11, marginInlineStart: 8, opacity: 0.6 }}>({lesson.id})</span>}
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
                    <div style={{ marginTop: 8 }}>
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewCollapsed((prev) => ({
                            ...prev,
                            [index]: !prev[index],
                          }))
                        }
                        style={{
                          background: "none",
                          border: "none",
                          padding: 0,
                          cursor: "pointer",
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--primary)",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <span style={{ display: "inline-block", transform: previewCollapsed[index] ? "rotate(0deg)" : "rotate(90deg)", transition: "transform 0.2s" }}>&#9654;</span>
                        Exam Preview
                      </button>
                      {!previewCollapsed[index] && (
                        <div
                          dir={language === "he" ? "rtl" : "ltr"}
                          style={{
                            marginTop: 6,
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
                          {examPreview[index]}
                        </div>
                      )}
                    </div>
                  )}
                  {examPreview[index] && !loadingPreview[index] && (
                    <div style={{ marginTop: 8 }}>
                      <label
                        style={{
                          display: "block",
                          fontSize: 12,
                          fontWeight: 500,
                          marginBottom: 4,
                          color: "var(--text-muted)",
                        }}
                      >
                        Exam Feedback
                      </label>
                      <div style={{ display: "flex", gap: 8 }}>
                        <textarea
                          value={examFeedback[index] ?? ""}
                          onChange={(e) =>
                            setExamFeedback((prev) => ({
                              ...prev,
                              [index]: e.target.value,
                            }))
                          }
                          placeholder="e.g. make questions easier, add word problems, focus on division..."
                          rows={2}
                          style={{ flex: 1 }}
                        />
                        <button
                          type="button"
                          className="primary"
                          onClick={() => applyFeedback(index)}
                          disabled={
                            !(examFeedback[index] ?? "").trim() ||
                            loadingPreview[index]
                          }
                          style={{
                            alignSelf: "flex-end",
                            whiteSpace: "nowrap",
                            fontSize: 12,
                          }}
                        >
                          Apply Feedback
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}

        <button type="button" className="secondary" onClick={addLesson} style={{ marginTop: 8 }}>
          + Add Lesson
        </button>
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
