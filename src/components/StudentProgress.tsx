"use client";

import { useState, useEffect, useCallback } from "react";
import type { Course } from "@/types/course";
import { APP_USERS } from "@/types/user";

const STUDENTS = APP_USERS.filter((u) => u.role === "student");

function AnalysisPopup({
  analysis,
  onClose,
}: {
  analysis: string;
  onClose: () => void;
}): React.ReactElement {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: 28,
          maxWidth: 520,
          width: "100%",
          maxHeight: "80vh",
          overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        <h3 style={{ fontSize: 16, marginBottom: 16 }}>Student Analysis</h3>
        <div
          dir="rtl"
          style={{
            fontSize: 14,
            lineHeight: 1.7,
            whiteSpace: "pre-wrap",
            color: "var(--text)",
          }}
        >
          {analysis}
        </div>
        <button
          className="primary"
          onClick={onClose}
          style={{ marginTop: 20, width: "100%" }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface DayUsage {
  date: string;
  minutes: number;
  messages: number;
}

interface ExamResult {
  correct: number;
  total: number;
  date: string;
}

interface StudentProgressProps {
  courses: Course[];
}

function UsageGraph({
  studentId,
}: {
  studentId: string;
}): React.ReactElement {
  const [usage, setUsage] = useState<DayUsage[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUsage = useCallback(async (): Promise<void> => {
    const res = await fetch(`/api/usage?studentId=${studentId}`);
    const data = (await res.json()) as DayUsage[];
    setUsage(data);
    setLoading(false);
  }, [studentId]);

  useEffect(() => {
    loadUsage();
  }, [loadUsage]);

  if (loading) {
    return (
      <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Loading...</p>
    );
  }

  const maxMinutes = Math.max(...usage.map((d) => d.minutes), 1);

  return (
    <div>
      <h3 style={{ fontSize: 14, marginBottom: 12, color: "var(--text-muted)" }}>
        Study time — last 7 days
      </h3>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 6,
          height: 120,
          padding: "0 4px",
        }}
      >
        {usage.map((day) => {
          const date = new Date(day.date + "T00:00:00");
          const dayName = DAY_NAMES[date.getDay()];
          const barHeight = Math.max((day.minutes / maxMinutes) * 100, 2);

          return (
            <div
              key={day.date}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                }}
              >
                {day.minutes > 0 ? `${day.minutes}m` : ""}
              </span>
              <div
                style={{
                  width: "100%",
                  maxWidth: 40,
                  height: barHeight,
                  background:
                    day.minutes > 0 ? "var(--primary)" : "var(--border)",
                  borderRadius: "4px 4px 0 0",
                  transition: "height 0.3s",
                }}
              />
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {dayName}
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: day.messages > 0 ? "var(--primary)" : "var(--text-muted)",
                  fontWeight: day.messages > 0 ? 600 : 400,
                }}
              >
                {day.messages > 0 ? `${day.messages} msg` : "—"}
              </span>
            </div>
          );
        })}
      </div>
      <div
        style={{
          marginTop: 8,
          fontSize: 13,
          color: "var(--text-muted)",
        }}
      >
        Total: {usage.reduce((sum, d) => sum + d.minutes, 0)} minutes,{" "}
        {usage.reduce((sum, d) => sum + d.messages, 0)} messages this week
      </div>
    </div>
  );
}

function LessonExamResults({
  studentId,
  courseId,
  lessonId,
}: {
  studentId: string;
  courseId: string;
  lessonId: string;
}): React.ReactElement {
  const [results, setResults] = useState<ExamResult[]>([]);

  useEffect(() => {
    async function load(): Promise<void> {
      const res = await fetch(
        `/api/exams?studentId=${studentId}&courseId=${courseId}&lessonId=${lessonId}`,
      );
      const data = (await res.json()) as ExamResult[];
      setResults(data);
    }
    load();
  }, [studentId, courseId, lessonId]);

  const last3 = results.slice(-3);

  if (last3.length === 0) {
    return (
      <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
        No exams yet
      </span>
    );
  }

  return (
    <div style={{ display: "flex", gap: 6 }}>
      {last3.map((r, i) => {
        const passed = r.correct >= r.total / 2;
        return (
          <span
            key={i}
            style={{
              fontSize: 12,
              padding: "2px 6px",
              borderRadius: 4,
              background: passed ? "#dcfce7" : "#fee2e2",
              color: passed ? "#166534" : "#991b1b",
            }}
          >
            {r.correct}/{r.total}
          </span>
        );
      })}
    </div>
  );
}

function StudentCard({
  studentId,
  studentName,
  courses,
}: {
  studentId: string;
  studentName: string;
  courses: Course[];
}): React.ReactElement {
  const [assignedCourses, setAssignedCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);

  async function handleAnalyze(courseId: string, lessonId: string): Promise<void> {
    const key = `${courseId}:${lessonId}`;
    setAnalyzing(key);
    try {
      const res = await fetch(
        `/api/analyze?studentId=${studentId}&courseId=${courseId}&lessonId=${lessonId}`,
      );
      const data = (await res.json()) as { analysis: string };
      setAnalysis(data.analysis);
    } catch {
      setAnalysis("Failed to analyze. Please try again.");
    }
    setAnalyzing(null);
  }

  useEffect(() => {
    async function load(): Promise<void> {
      const res = await fetch(`/api/assignments?studentId=${studentId}`);
      const ids = (await res.json()) as string[];
      setAssignedCourses(courses.filter((c) => ids.includes(c.id)));
      setLoading(false);
    }
    load();
  }, [studentId, courses]);

  return (
    <div
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: 24,
      }}
    >
      <h2 style={{ fontSize: 18, marginBottom: 20 }}>{studentName}</h2>

      <UsageGraph studentId={studentId} />

      <div
        style={{
          marginTop: 24,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {loading && (
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Loading...</p>
        )}

        {!loading && assignedCourses.length === 0 && (
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
            No courses assigned.
          </p>
        )}

        {assignedCourses.map((course) => (
          <div
            key={course.id}
            style={{
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: 16,
            }}
          >
            <h3 style={{ fontSize: 15, marginBottom: 12 }}>{course.name}</h3>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {course.lessons
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((lesson) => (
                  <div
                    key={lesson.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 12px",
                      background: "var(--bg)",
                      borderRadius: 6,
                      fontSize: 14,
                    }}
                  >
                    <span>{lesson.title}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button
                        className="secondary"
                        onClick={() => handleAnalyze(course.id, lesson.id)}
                        disabled={analyzing === `${course.id}:${lesson.id}`}
                        style={{ fontSize: 11, padding: "3px 8px", whiteSpace: "nowrap" }}
                      >
                        {analyzing === `${course.id}:${lesson.id}`
                          ? "Analyzing..."
                          : "Analyze Progress"}
                      </button>
                      <LessonExamResults
                        studentId={studentId}
                        courseId={course.id}
                        lessonId={lesson.id}
                      />
                    </div>
                  </div>
                ))}
            </div>

            {course.lessons.length === 0 && (
              <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
                No lessons
              </p>
            )}
          </div>
        ))}
      </div>

      {analysis && (
        <AnalysisPopup
          analysis={analysis}
          onClose={() => setAnalysis(null)}
        />
      )}
    </div>
  );
}

export default function StudentProgress({
  courses,
}: StudentProgressProps): React.ReactElement {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {STUDENTS.map((student) => (
        <StudentCard
          key={student.id}
          studentId={student.id}
          studentName={student.name}
          courses={courses}
        />
      ))}
    </div>
  );
}
