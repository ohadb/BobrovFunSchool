"use client";

import type { Course, CourseLanguage } from "@/types/course";

const languageLabels: Record<CourseLanguage, string> = {
  en: "English",
  he: "עברית",
};

interface CourseCardProps {
  course: Course;
  onEdit: (course: Course) => void;
  onDelete: (id: string) => void;
}

export default function CourseCard({ course, onEdit, onDelete }: CourseCardProps): React.ReactElement {
  return (
    <div
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div>
        <h3 style={{ fontSize: 18, marginBottom: 4 }}>{course.name}</h3>
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>{course.description}</p>
      </div>

      <div style={{ display: "flex", gap: 8, fontSize: 13, color: "var(--text-muted)" }}>
        <span>{languageLabels[course.language]}</span>
        <span>·</span>
        <span>{course.lessons.length} {course.lessons.length === 1 ? "lesson" : "lessons"}</span>
      </div>

      {course.lessons.length > 0 && (
        <ul style={{ fontSize: 13, paddingLeft: 20, color: "var(--text-muted)" }}>
          {course.lessons.map((lesson) => (
            <li key={lesson.id}>{lesson.title}</li>
          ))}
        </ul>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
        <button className="secondary" onClick={() => onEdit(course)}>
          Edit
        </button>
        <button className="danger" onClick={() => onDelete(course.id)}>
          Delete
        </button>
      </div>
    </div>
  );
}
