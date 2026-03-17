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
  const [examPreview, setExamPreview] = useState<Record<string, string>>(
    () => {
      const initial: Record<string, string> = {};
      course?.lessons.forEach((l) => {
        if (l.exam?.preview) initial[l.id] = l.exam.preview;
      });
      return initial;
    },
  );
  const [examFeedback, setExamFeedback] = useState<Record<string, string>>({});
  const [loadingPreview, setLoadingPreview] = useState<Record<string, boolean>>(
    {},
  );
  const [previewImages, setPreviewImages] = useState<Record<string, string[]>>({});
  const [previewCollapsed, setPreviewCollapsed] = useState<Record<string, boolean>>(
    () => {
      const initial: Record<string, boolean> = {};
      course?.lessons.forEach((l) => {
        if (l.exam?.preview) initial[l.id] = true;
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
    const lessonId = updated[index].id!;
    if (updated[index].exam) {
      const { exam: _, ...rest } = updated[index];
      updated[index] = rest as LessonInput;
      setExamPreview((prev) => {
        const next = { ...prev };
        delete next[lessonId];
        return next;
      });
    } else {
      updated[index] = { ...updated[index], exam: { description: "" } };
      generateExamPreview(updated[index]);
    }
    setLessons(updated);
  };

  const consumeExamStream = async (
    lessonId: string,
    fetchBody: Record<string, unknown>,
  ): Promise<void> => {
    console.log(`[Exam Preview] Starting for lesson ${lessonId}`, fetchBody);
    setLoadingPreview((prev) => ({ ...prev, [lessonId]: true }));
    setExamPreview((prev) => ({ ...prev, [lessonId]: "" }));
    setPreviewImages((prev) => ({ ...prev, [lessonId]: [] }));
    setPreviewCollapsed((prev) => ({ ...prev, [lessonId]: false }));
    try {
      const res = await fetch("/api/exam-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fetchBody),
      });
      console.log(`[Exam Preview] Response status: ${res.status}`);
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`API ${res.status}: ${errText}`);
      }
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");
      const decoder = new TextDecoder();
      let buffer = "";
      let done = false;
      let questionCount = 0;
      while (!done) {
        const { value, done: streamDone } = await reader.read();
        done = streamDone;
        if (value) buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          const eventMatch = part.match(/^event:\s*(.+)$/m);
          const dataMatch = part.match(/^data:\s*(.+)$/m);
          if (!eventMatch || !dataMatch) continue;
          const event = eventMatch[1];
          console.log(`[Exam Preview] Event: ${event}`);
          if (event === "done") break;
          if (event === "question") {
            questionCount++;
            const payload = JSON.parse(dataMatch[1]) as {
              index: number;
              text: string;
              images: string[];
            };
            console.log(`[Exam Preview] Question ${questionCount} received for ${lessonId}`);
            setExamPreview((prev) => {
              const current = prev[lessonId] ?? "";
              return {
                ...prev,
                [lessonId]: current ? current + "\n" + payload.text : payload.text,
              };
            });
            if (payload.images.length > 0) {
              setPreviewImages((prev) => ({
                ...prev,
                [lessonId]: [...(prev[lessonId] ?? []), ...payload.images],
              }));
            }
          }
        }
      }
      console.log(`[Exam Preview] Stream done. ${questionCount} questions received for ${lessonId}`);
      if (questionCount === 0) {
        setExamPreview((prev) => ({
          ...prev,
          [lessonId]: prev[lessonId] || "No questions were generated. Check the Vercel function logs for details.",
        }));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[Exam Preview] Failed for lesson ${lessonId}:`, err);
      setExamPreview((prev) => ({
        ...prev,
        [lessonId]: prev[lessonId] || `Failed to generate preview: ${message}`,
      }));
    }
    setLoadingPreview((prev) => ({ ...prev, [lessonId]: false }));
  };

  const generateExamPreview = async (
    lesson: LessonInput,
  ): Promise<void> => {
    const lessonId = lesson.id!;
    if (!lesson.title && !lesson.content) {
      setExamPreview((prev) => ({
        ...prev,
        [lessonId]: "Add lesson title and content first to see an exam preview.",
      }));
      return;
    }
    await consumeExamStream(lessonId, {
      courseName: name,
      lessonTitle: lesson.title,
      lessonContent: lesson.content,
      language,
      llmBackend,
    });
  };

  const applyFeedback = async (lesson: LessonInput): Promise<void> => {
    const lessonId = lesson.id!;
    const feedback = (examFeedback[lessonId] ?? "").trim();
    if (!feedback || !examPreview[lessonId]) return;
    setExamFeedback((prev) => ({ ...prev, [lessonId]: "" }));
    await consumeExamStream(lessonId, {
      courseName: name,
      lessonTitle: lesson.title,
      lessonContent: lesson.content,
      language,
      llmBackend,
      currentPreview: examPreview[lessonId],
      feedback,
    });
  };

  const updateExamDescription = (index: number, description: string): void => {
    const updated = [...lessons];
    updated[index] = { ...updated[index], exam: { description } };
    setLessons(updated);
  };

  const removeLesson = (index: number): void => {
    if (!window.confirm("Are you sure you want to delete this lesson?")) return;
    const removedId = lessons[index].id;
    if (removedId) {
      setExamPreview((prev) => { const next = { ...prev }; delete next[removedId]; return next; });
      setExamFeedback((prev) => { const next = { ...prev }; delete next[removedId]; return next; });
      setLoadingPreview((prev) => { const next = { ...prev }; delete next[removedId]; return next; });
      setPreviewImages((prev) => { const next = { ...prev }; delete next[removedId]; return next; });
      setPreviewCollapsed((prev) => { const next = { ...prev }; delete next[removedId]; return next; });
    }
    setLessons(
      lessons
        .filter((_, i) => i !== index)
        .map((l, i) => ({ ...l, order: i + 1 })),
    );
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setSaving(true);
    const lessonsWithPreview = lessons.map((l) => ({
      ...l,
      exam: l.exam
        ? { ...l.exam, preview: examPreview[l.id!] ?? l.exam.preview ?? "" }
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
            key={lesson.id ?? index}
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
                Lesson {lesson.order}{lesson.id && <span style={{ fontSize: 11, marginInlineStart: 8, opacity: 0.6 }}>({lesson.id})<button type="button" onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(lesson.id!); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, padding: "0 4px", opacity: 0.6 }} title="Copy UUID">📋</button></span>}
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
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className="secondary"
                  style={{ padding: "4px 8px", fontSize: 12 }}
                  onClick={() => toggleExam(index)}
                >
                  {lesson.exam ? "Remove Exam" : "+ Add Exam"}
                </button>
                {lesson.exam && (
                  <button
                    type="button"
                    className="secondary"
                    style={{ padding: "4px 8px", fontSize: 12 }}
                    onClick={() => generateExamPreview(lesson)}
                    disabled={loadingPreview[lesson.id!]}
                  >
                    Refresh Exam
                  </button>
                )}
              </div>
              {lesson.exam && (
                <>
                  {loadingPreview[lesson.id!] && (
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
                  {examPreview[lesson.id!] && !loadingPreview[lesson.id!] && (
                    <div style={{ marginTop: 8 }}>
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewCollapsed((prev) => ({
                            ...prev,
                            [lesson.id!]: !prev[lesson.id!],
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
                        <span style={{ display: "inline-block", transform: previewCollapsed[lesson.id!] ? "rotate(0deg)" : "rotate(90deg)", transition: "transform 0.2s" }}>&#9654;</span>
                        Exam Preview
                      </button>
                      {!previewCollapsed[lesson.id!] && (
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
                          {examPreview[lesson.id!]}
                          {(previewImages[lesson.id!] ?? []).length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                              {previewImages[lesson.id!].map((imgId) => (
                                <img
                                  key={imgId}
                                  src={`/api/image/${imgId}`}
                                  alt="Exam preview illustration"
                                  style={{ maxWidth: 200, borderRadius: 6, border: "1px solid #c7d2fe" }}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {examPreview[lesson.id!] && !loadingPreview[lesson.id!] && (
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
                          value={examFeedback[lesson.id!] ?? ""}
                          onChange={(e) =>
                            setExamFeedback((prev) => ({
                              ...prev,
                              [lesson.id!]: e.target.value,
                            }))
                          }
                          placeholder="e.g. make questions easier, add word problems, focus on division..."
                          rows={2}
                          style={{ flex: 1 }}
                        />
                        <button
                          type="button"
                          className="primary"
                          onClick={() => applyFeedback(lesson)}
                          disabled={
                            !(examFeedback[lesson.id!] ?? "").trim() ||
                            loadingPreview[lesson.id!]
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
