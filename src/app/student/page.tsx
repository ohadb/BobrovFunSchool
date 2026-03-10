"use client";

import { useState, useEffect } from "react";
import type { Course, Lesson } from "@/types/course";
import LessonChat from "@/components/LessonChat";
import { getCurrentUserId } from "@/lib/auth";

export default function StudentPortal(): React.ReactElement {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Course | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  useEffect(() => {
    const studentId = getCurrentUserId();

    async function loadAssignedCourses(): Promise<void> {
      const assignRes = await fetch(
        `/api/assignments?studentId=${studentId}`,
      );
      const assignedIds = (await assignRes.json()) as string[];

      if (assignedIds.length === 0) {
        setCourses([]);
        setLoading(false);
        return;
      }

      const coursesRes = await fetch("/api/courses");
      const allCourses = (await coursesRes.json()) as Course[];
      setCourses(allCourses.filter((c) => assignedIds.includes(c.id)));
      setLoading(false);
    }

    loadAssignedCourses();
  }, []);

  if (selected && selectedLesson) {
    return (
      <LessonChat
        courseId={selected.id}
        lessonId={selectedLesson.id}
        lessonTitle={selectedLesson.title}
        lessonContent={selectedLesson.content}
        hasExam={!!selectedLesson.exam}
        onBack={() => setSelectedLesson(null)}
      />
    );
  }

  if (selected) {
    return (
      <div
        dir="rtl"
        style={{ maxWidth: 700, margin: "0 auto", padding: "32px 16px" }}
      >
        <button
          className="secondary"
          onClick={() => setSelected(null)}
          style={{ marginBottom: 24 }}
        >
          חזרה לקורסים →
        </button>
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>{selected.name}</h1>
        <p style={{ color: "var(--text-muted)", marginBottom: 32 }}>
          {selected.description}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {selected.lessons
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((lesson, i) => (
              <button
                key={lesson.id}
                onClick={() => setSelectedLesson(lesson)}
                style={{
                  background: "var(--card-bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  padding: 20,
                  textAlign: "right",
                  cursor: "pointer",
                  transition: "border-color 0.2s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.borderColor = "var(--primary)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.borderColor = "var(--border)")
                }
              >
                <h3 style={{ fontSize: 16, marginBottom: 8 }}>
                  {i + 1}. {lesson.title}
                </h3>
                <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
                  {lesson.content}
                </p>
              </button>
            ))}
          {selected.lessons.length === 0 && (
            <p style={{ color: "var(--text-muted)" }}>אין שיעורים עדיין.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      style={{ maxWidth: 700, margin: "0 auto", padding: "32px 16px" }}
    >
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16, textAlign: "center" }}>
        !Bobrov Fun School
      </h1>
      <h2 style={{ fontSize: 20, marginBottom: 4 }}>הקורסים שלי</h2>
      <p style={{ color: "var(--text-muted)", marginBottom: 32 }}>
        בחרו קורס כדי להתחיל ללמוד!
      </p>

      {loading && <p>טוען...</p>}

      {!loading && courses.length === 0 && (
        <p style={{ color: "var(--text-muted)" }}>אין קורסים זמינים עדיין.</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {courses.map((course) => (
          <button
            key={course.id}
            onClick={() => setSelected(course)}
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: 20,
              textAlign: "right",
              cursor: "pointer",
              transition: "border-color 0.2s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.borderColor = "var(--primary)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.borderColor = "var(--border)")
            }
          >
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
              {course.name}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
              {course.description}
            </div>
            <div
              style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}
            >
              {course.lessons.length} שיעורים
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
