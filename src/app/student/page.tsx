"use client";

import { useState, useEffect } from "react";
import type { Course, Lesson } from "@/types/course";
import LessonChat from "@/components/LessonChat";
import { getCurrentUserId } from "@/lib/auth";
import { APP_USERS } from "@/types/user";

const COURSE_COLORS = [
  { bg: "#fef3c7", border: "#fbbf24", emoji: "🌟" },
  { bg: "#dbeafe", border: "#60a5fa", emoji: "🚀" },
  { bg: "#fce7f3", border: "#f472b6", emoji: "🎨" },
  { bg: "#d1fae5", border: "#34d399", emoji: "🌿" },
  { bg: "#ede9fe", border: "#a78bfa", emoji: "✨" },
  { bg: "#ffedd5", border: "#fb923c", emoji: "🔥" },
];

const LESSON_COLORS = [
  { bg: "#fef9c3", border: "#facc15" },
  { bg: "#cffafe", border: "#22d3ee" },
  { bg: "#fce7f3", border: "#ec4899" },
  { bg: "#dcfce7", border: "#4ade80" },
  { bg: "#e0e7ff", border: "#818cf8" },
  { bg: "#fff1f2", border: "#fb7185" },
];

export default function StudentPortal(): React.ReactElement {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Course | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  const studentId = getCurrentUserId();
  const student = APP_USERS.find((u) => u.id === studentId);
  const studentName = student?.nameHe ?? studentId;

  useEffect(() => {
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
  }, [studentId]);

  if (selected && selectedLesson) {
    return (
      <LessonChat
        courseId={selected.id}
        lessonId={selectedLesson.id}
        lessonTitle={selectedLesson.title}
        lessonContent={selectedLesson.content}
        hasExam={!!selectedLesson.exam}
        isHebrew={selected.language === "he"}
        onBack={() => setSelectedLesson(null)}
      />
    );
  }

  if (selected) {
    return (
      <div
        dir="rtl"
        className="student-theme"
        style={{ maxWidth: 700, margin: "0 auto", padding: "32px 16px" }}
      >
        <button
          onClick={() => setSelected(null)}
          style={{
            marginBottom: 24,
            background: "#fff",
            border: "2px solid #fed7aa",
            borderRadius: 12,
            padding: "8px 20px",
            fontSize: 15,
            fontWeight: 600,
            color: "#f97316",
            cursor: "pointer",
          }}
        >
          חזרה לקורסים →
        </button>
        <h1 style={{ fontSize: 26, marginBottom: 8, color: "#1c1917" }}>
          {selected.name}
        </h1>
        <p style={{ color: "#78716c", marginBottom: 32, fontSize: 15 }}>
          {selected.description}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {selected.lessons
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((lesson, i) => {
              const color = LESSON_COLORS[i % LESSON_COLORS.length];
              return (
                <button
                  key={lesson.id}
                  onClick={() => setSelectedLesson(lesson)}
                  style={{
                    background: color.bg,
                    border: `2px solid ${color.border}`,
                    borderRadius: 16,
                    padding: "20px 24px",
                    textAlign: "right",
                    cursor: "pointer",
                    transition: "transform 0.2s, box-shadow 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = `0 6px 20px ${color.border}40`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <h3 style={{ fontSize: 18, marginBottom: 8, color: "#1c1917" }}>
                    {["📚", "📝", "🎯", "💡", "🧩", "🏆"][i % 6]} שיעור {i + 1}: {lesson.title}
                  </h3>
                  <p style={{ color: "#78716c", fontSize: 14 }}>
                    {lesson.content}
                  </p>
                </button>
              );
            })}
          {selected.lessons.length === 0 && (
            <p style={{ color: "#78716c" }}>אין שיעורים עדיין.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="student-theme"
      style={{ maxWidth: 700, margin: "0 auto", padding: "32px 16px" }}
    >
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🎓</div>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: "#1c1917", marginBottom: 4 }}>
          !Bobrov Fun School
        </h1>
        <p style={{ fontSize: 18, color: "#f97316", fontWeight: 600 }}>
          שלום {studentName}! 👋
        </p>
      </div>

      <h2 style={{ fontSize: 22, marginBottom: 4, color: "#1c1917" }}>
        הקורסים שלי
      </h2>
      <p style={{ color: "#78716c", marginBottom: 24, fontSize: 15 }}>
        בחרו קורס כדי להתחיל ללמוד!
      </p>

      {loading && (
        <div style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📖</div>
          <p style={{ color: "#78716c" }}>טוען...</p>
        </div>
      )}

      {!loading && courses.length === 0 && (
        <div style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🌱</div>
          <p style={{ color: "#78716c", fontSize: 16 }}>אין קורסים זמינים עדיין.</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {courses.map((course, i) => {
          const color = COURSE_COLORS[i % COURSE_COLORS.length];
          return (
            <button
              key={course.id}
              onClick={() => setSelected(course)}
              style={{
                background: color.bg,
                border: `2px solid ${color.border}`,
                borderRadius: 20,
                padding: "24px 28px",
                textAlign: "right",
                cursor: "pointer",
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.02)";
                e.currentTarget.style.boxShadow = `0 8px 24px ${color.border}40`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 36 }}>{color.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4, color: "#1c1917" }}>
                    {course.name}
                  </div>
                  <div style={{ fontSize: 14, color: "#78716c" }}>
                    {course.description}
                  </div>
                  <div style={{ fontSize: 13, color: "#78716c", marginTop: 8 }}>
                    📚 {course.lessons.length} שיעורים
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
