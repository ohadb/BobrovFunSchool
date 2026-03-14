"use client";

import { useState, useEffect, useCallback } from "react";
import type { Course, Lesson } from "@/types/course";
import LessonChat from "@/components/LessonChat";
import { getCurrentUserId } from "@/lib/auth";
import { APP_USERS } from "@/types/user";
import type { LessonProgress } from "@/app/api/student-progress/route";

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

const THEMES = [
  { id: "warm", label: "🧡", gradient: "linear-gradient(135deg, #fef3c7 0%, #fce7f3 50%, #dbeafe 100%)", primary: "#f97316", primaryHover: "#ea580c", border: "#fed7aa", bubbleBg: "#fff7ed" },
  { id: "ocean", label: "💙", gradient: "linear-gradient(135deg, #dbeafe 0%, #cffafe 50%, #d1fae5 100%)", primary: "#3b82f6", primaryHover: "#2563eb", border: "#93c5fd", bubbleBg: "#eff6ff" },
  { id: "forest", label: "💚", gradient: "linear-gradient(135deg, #d1fae5 0%, #fef9c3 50%, #dcfce7 100%)", primary: "#22c55e", primaryHover: "#16a34a", border: "#86efac", bubbleBg: "#f0fdf4" },
  { id: "galaxy", label: "💜", gradient: "linear-gradient(135deg, #ede9fe 0%, #fce7f3 50%, #dbeafe 100%)", primary: "#8b5cf6", primaryHover: "#7c3aed", border: "#c4b5fd", bubbleBg: "#f5f3ff" },
  { id: "sunset", label: "💖", gradient: "linear-gradient(135deg, #fce7f3 0%, #fef3c7 50%, #ffedd5 100%)", primary: "#ec4899", primaryHover: "#db2777", border: "#f9a8d4", bubbleBg: "#fdf2f8" },
];

function getStoredTheme(): string {
  if (typeof window === "undefined") return "warm";
  return localStorage.getItem("student-theme") ?? "warm";
}

function storeTheme(themeId: string): void {
  localStorage.setItem("student-theme", themeId);
}

const STUDENT_AVATARS: Record<string, string> = {
  roni: "👧",
  gaia: "👧🏻",
};

export default function StudentPortal(): React.ReactElement {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Course | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [themeId, setThemeId] = useState("warm");
  const [progress, setProgress] = useState<Record<string, LessonProgress>>({});

  const studentId = getCurrentUserId();
  const student = APP_USERS.find((u) => u.id === studentId);
  const studentName = student?.nameHe ?? studentId;
  const studentAvatar = STUDENT_AVATARS[studentId] ?? "🧒";
  const theme = THEMES.find((t) => t.id === themeId) ?? THEMES[0];

  useEffect(() => {
    setThemeId(getStoredTheme());
  }, []);

  const handleThemeChange = (id: string): void => {
    setThemeId(id);
    storeTheme(id);
  };

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

  const loadProgress = useCallback(async (course: Course): Promise<void> => {
    if (course.lessons.length === 0) return;
    const lessonIds = course.lessons.map((l) => l.id).join(",");
    const res = await fetch(
      `/api/student-progress?studentId=${studentId}&courseId=${course.id}&lessonIds=${lessonIds}`,
    );
    const data = (await res.json()) as LessonProgress[];
    const map: Record<string, LessonProgress> = {};
    for (const p of data) map[p.lessonId] = p;
    setProgress(map);
  }, [studentId]);

  useEffect(() => {
    if (selected) loadProgress(selected);
  }, [selected, loadProgress]);

  if (selected && selectedLesson) {
    return (
      <LessonChat
        courseId={selected.id}
        lessonId={selectedLesson.id}
        lessonTitle={selectedLesson.title}
        lessonContent={selectedLesson.content}
        hasExam={!!selectedLesson.exam}
        isHebrew={selected.language === "he"}
        theme={theme}
        onBack={() => {
          setSelectedLesson(null);
          loadProgress(selected);
        }}
      />
    );
  }

  if (selected) {
    return (
      <div
        dir="rtl"
        style={{
          maxWidth: 700,
          margin: "0 auto",
          padding: "32px 16px",
          minHeight: "100vh",
          background: theme.gradient,
          fontFamily: "'Nunito', 'Rubik', -apple-system, sans-serif",
        }}
      >
        <button
          onClick={() => { setSelected(null); setProgress({}); }}
          style={{
            marginBottom: 24,
            background: "#fff",
            border: `2px solid ${theme.border}`,
            borderRadius: 14,
            padding: "10px 22px",
            fontSize: 16,
            fontWeight: 700,
            color: theme.primary,
            cursor: "pointer",
          }}
        >
          חזרה לקורסים →
        </button>
        <h1 style={{ fontSize: 28, marginBottom: 8, color: "#1c1917" }}>
          {selected.name}
        </h1>
        <p style={{ color: "#78716c", marginBottom: 32, fontSize: 16 }}>
          {selected.description}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {selected.lessons
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((lesson, i) => {
              const color = LESSON_COLORS[i % LESSON_COLORS.length];
              const lp = progress[lesson.id];
              const started = lp && lp.messageCount > 0;
              const hasScore = lp && lp.bestScore !== null;
              return (
                <button
                  key={lesson.id}
                  onClick={() => setSelectedLesson(lesson)}
                  style={{
                    background: color.bg,
                    border: `2px solid ${color.border}`,
                    borderRadius: 18,
                    padding: "22px 26px",
                    textAlign: "right",
                    cursor: "pointer",
                    transition: "transform 0.2s, box-shadow 0.2s",
                    position: "relative",
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
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 22 }}>
                      {["📚", "📝", "🎯", "💡", "🧩", "🏆"][i % 6]}
                    </span>
                    <h3 style={{ fontSize: 19, flex: 1, color: "#1c1917" }}>
                      שיעור {i + 1}: {lesson.title}
                    </h3>
                    {started && !hasScore && (
                      <span
                        style={{
                          background: "#fbbf24",
                          color: "#fff",
                          borderRadius: 20,
                          padding: "4px 12px",
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        בתהליך ⏳
                      </span>
                    )}
                    {hasScore && (
                      <span
                        style={{
                          background: lp.bestScore! >= 80 ? "#22c55e" : "#f97316",
                          color: "#fff",
                          borderRadius: 20,
                          padding: "4px 12px",
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        {lp.bestScore! >= 80 ? "✅" : "📝"} {lp.bestScore}%
                      </span>
                    )}
                    {!started && (
                      <span
                        style={{
                          background: "#e5e7eb",
                          color: "#9ca3af",
                          borderRadius: 20,
                          padding: "4px 12px",
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        חדש ✨
                      </span>
                    )}
                  </div>
                  <p style={{ color: "#78716c", fontSize: 15, marginTop: 8 }}>
                    {lesson.content}
                  </p>
                  {started && (
                    <div
                      style={{
                        marginTop: 10,
                        fontSize: 12,
                        color: "#78716c",
                        display: "flex",
                        gap: 16,
                      }}
                    >
                      <span>💬 {lp.messageCount} הודעות</span>
                      {hasScore && <span>🏆 ציון מיטבי: {lp.bestScore}%</span>}
                    </div>
                  )}
                </button>
              );
            })}
          {selected.lessons.length === 0 && (
            <p style={{ color: "#78716c", fontSize: 16 }}>אין שיעורים עדיין.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      style={{
        maxWidth: 700,
        margin: "0 auto",
        padding: "32px 16px",
        minHeight: "100vh",
        background: theme.gradient,
        fontFamily: "'Nunito', 'Rubik', -apple-system, sans-serif",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: "#fff",
            border: `3px solid ${theme.primary}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 44,
            margin: "0 auto 12px",
            boxShadow: `0 4px 16px ${theme.primary}30`,
          }}
        >
          {studentAvatar}
        </div>
        <h1 style={{ fontSize: 34, fontWeight: 800, color: "#1c1917", marginBottom: 4 }}>
          !Bobrov Fun School
        </h1>
        <p style={{ fontSize: 22, color: theme.primary, fontWeight: 700 }}>
          שלום {studentName}! 👋
        </p>

        <div style={{ marginTop: 16, display: "flex", justifyContent: "center", gap: 8 }}>
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => handleThemeChange(t.id)}
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                border: themeId === t.id ? `3px solid ${t.primary}` : "2px solid #e5e7eb",
                background: "#fff",
                fontSize: 18,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "transform 0.2s",
                transform: themeId === t.id ? "scale(1.15)" : "scale(1)",
                boxShadow: themeId === t.id ? `0 2px 8px ${t.primary}40` : "none",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <h2 style={{ fontSize: 24, marginBottom: 6, color: "#1c1917" }}>
        📖 הקורסים שלי
      </h2>
      <p style={{ color: "#78716c", marginBottom: 24, fontSize: 16 }}>
        בחרו קורס כדי להתחיל ללמוד!
      </p>

      {loading && (
        <div style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📖</div>
          <p style={{ color: "#78716c", fontSize: 16 }}>טוען...</p>
        </div>
      )}

      {!loading && courses.length === 0 && (
        <div style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🌱</div>
          <p style={{ color: "#78716c", fontSize: 17 }}>אין קורסים זמינים עדיין.</p>
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
                borderRadius: 22,
                padding: "26px 30px",
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
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: 40 }}>{color.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 6, color: "#1c1917" }}>
                    {course.name}
                  </div>
                  <div style={{ fontSize: 15, color: "#78716c" }}>
                    {course.description}
                  </div>
                  <div style={{ fontSize: 14, color: "#78716c", marginTop: 8 }}>
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
