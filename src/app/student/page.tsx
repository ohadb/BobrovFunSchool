"use client";

import { useState, useEffect } from "react";
import type { Course, Lesson } from "@/types/course";
import LessonChat from "@/components/LessonChat";

export default function StudentPortal(): React.ReactElement {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Course | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  useEffect(() => {
    fetch("/api/courses")
      .then((r) => r.json())
      .then((data: Course[]) => {
        setCourses(data);
        setLoading(false);
      });
  }, []);

  if (selected && selectedLesson) {
    return (
      <LessonChat
        courseId={selected.id}
        lessonId={selectedLesson.id}
        lessonTitle={selectedLesson.title}
        lessonContent={selectedLesson.content}
        onBack={() => setSelectedLesson(null)}
      />
    );
  }

  if (selected) {
    return (
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "32px 16px" }}>
        <button
          className="secondary"
          onClick={() => setSelected(null)}
          style={{ marginBottom: 24 }}
        >
          ← Back to courses
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
                  textAlign: "left",
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
            <p style={{ color: "var(--text-muted)" }}>No lessons yet.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "32px 16px" }}>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>My Courses</h1>
      <p style={{ color: "var(--text-muted)", marginBottom: 32 }}>
        Pick a course to start learning!
      </p>

      {loading && <p>Loading...</p>}

      {!loading && courses.length === 0 && (
        <p style={{ color: "var(--text-muted)" }}>No courses available yet.</p>
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
              textAlign: "left",
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
              {course.lessons.length} lesson
              {course.lessons.length !== 1 ? "s" : ""}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
