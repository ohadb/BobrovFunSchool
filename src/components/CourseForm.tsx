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
    enableImages: boolean;
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
  const [enableImages, setEnableImages] = useState(
    course?.enableImages ?? false,
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
  const [previewImages, setPreviewImages] = useState<Record<string, string[][]>>({});
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

  const fetchOneQuestion = async (
    baseBody: Record<string, unknown>,
    questionNum: number,
  ): Promise<{ questionNum: number; text: string; images: string[] }> => {
    try {
      const res = await fetch("/api/exam-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...baseBody, questionNum }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`API ${res.status}: ${errText}`);
      }
      const payload = (await res.json()) as {
        index: number;
        text: string;
        images: string[];
      };
      return { questionNum, text: payload.text, images: payload.images };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[Exam Preview] Q${questionNum} failed:`, err);
      return { questionNum, text: `${questionNum}. (Failed: ${message})`, images: [] };
    }
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
    setLoadingPreview((prev) => ({ ...prev, [lessonId]: true }));
    setExamPreview((prev) => ({ ...prev, [lessonId]: "" }));
    setPreviewImages((prev) => ({ ...prev, [lessonId]: [] }));
    setPreviewCollapsed((prev) => ({ ...prev, [lessonId]: false }));

    const baseBody = {
      courseName: name,
      lessonTitle: lesson.title,
      lessonContent: lesson.content,
      language,
      llmBackend,
      enableImages,
    };
    const delay = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
    const results = await Promise.all(
      [1, 2, 3, 4, 5].map(async (q, i) => {
        if (i > 0) await delay(i * 200);
        return fetchOneQuestion(baseBody, q);
      }),
    );
    results.sort((a, b) => a.questionNum - b.questionNum);
    setExamPreview((prev) => ({
      ...prev,
      [lessonId]: results.map((r) => r.text).join("\n"),
    }));
    setPreviewImages((prev) => ({
      ...prev,
      [lessonId]: results.map((r) => r.images),
    }));
    setLoadingPreview((prev) => ({ ...prev, [lessonId]: false }));
  };

  const applyFeedback = async (lesson: LessonInput): Promise<void> => {
    const lessonId = lesson.id!;
    const feedback = (examFeedback[lessonId] ?? "").trim();
    if (!feedback || !examPreview[lessonId]) return;
    setExamFeedback((prev) => ({ ...prev, [lessonId]: "" }));
    setLoadingPreview((prev) => ({ ...prev, [lessonId]: true }));
    setExamPreview((prev) => ({ ...prev, [lessonId]: "" }));
    setPreviewImages((prev) => ({ ...prev, [lessonId]: [] }));
    setPreviewCollapsed((prev) => ({ ...prev, [lessonId]: false }));

    // Parse existing questions for per-question feedback
    const existingQuestions: string[] = [];
    const lines = examPreview[lessonId].split("\n");
    let current = "";
    for (const line of lines) {
      if (/^\d+[\.\)]\s/.test(line)) {
        if (current) existingQuestions.push(current.trim());
        current = line;
      } else {
        current += "\n" + line;
      }
    }
    if (current) existingQuestions.push(current.trim());

    const baseBody = {
      courseName: name,
      lessonTitle: lesson.title,
      lessonContent: lesson.content,
      language,
      llmBackend,
      enableImages,
      feedback,
    };
    const delay = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
    const results = await Promise.all(
      [1, 2, 3, 4, 5].map(async (q, i) => {
        if (i > 0) await delay(i * 200);
        return fetchOneQuestion({ ...baseBody, currentQuestion: existingQuestions[q - 1] ?? "" }, q);
      }),
    );
    results.sort((a, b) => a.questionNum - b.questionNum);
    setExamPreview((prev) => ({
      ...prev,
      [lessonId]: results.map((r) => r.text).join("\n"),
    }));
    setPreviewImages((prev) => ({
      ...prev,
      [lessonId]: results.map((r) => r.images),
    }));
    setLoadingPreview((prev) => ({ ...prev, [lessonId]: false }));
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
    await onSave({ name, description, language, llmBackend, enableImages, lessons: lessonsWithPreview });
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
        <label
          style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 500, cursor: "pointer" }}
        >
          <input
            type="checkbox"
            checked={enableImages}
            onChange={(e) => setEnableImages(e.target.checked)}
            style={{ width: 18, height: 18, cursor: "pointer" }}
          />
          Enable image generation for exams
        </label>
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
                            color: "var(--text)",
                          }}
                        >
                          {examPreview[lesson.id!].split("\n").map((line, qIdx) => {
                            const qImages = (previewImages[lesson.id!] ?? [])[qIdx] ?? [];
                            return (
                              <div key={qIdx} style={{ marginBottom: qImages.length > 0 ? 8 : 0 }}>
                                <span dangerouslySetInnerHTML={{ __html: line }} />
                                {qImages.length > 0 && (
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                                    {qImages.map((imgId) => (
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
                            );
                          })}
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
