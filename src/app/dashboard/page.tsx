"use client";

import { useState, useEffect, useCallback } from "react";
import type { Course, CourseLanguage } from "@/types/course";
import CourseCard from "@/components/CourseCard";
import CourseForm from "@/components/CourseForm";
import CourseAssigner from "@/components/CourseAssigner";
import StudentProgress from "@/components/StudentProgress";

type ViewMode = "list" | "create" | "edit";
type Tab = "courses" | "progress";

export default function Dashboard(): React.ReactElement {
  const [courses, setCourses] = useState<Course[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [editingCourse, setEditingCourse] = useState<Course | undefined>(
    undefined,
  );
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("courses");

  const fetchCourses = useCallback(async (): Promise<void> => {
    const response = await fetch("/api/courses");
    const data = (await response.json()) as Course[];
    setCourses(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleCreate = async (data: {
    name: string;
    description: string;
    language: CourseLanguage;
    lessons: { title: string; content: string; order: number }[];
  }): Promise<void> => {
    await fetch("/api/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setViewMode("list");
    await fetchCourses();
  };

  const handleUpdate = async (data: {
    name: string;
    description: string;
    language: CourseLanguage;
    lessons: { title: string; content: string; order: number }[];
  }): Promise<void> => {
    if (!editingCourse) return;
    await fetch(`/api/courses/${editingCourse.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setViewMode("list");
    setEditingCourse(undefined);
    await fetchCourses();
  };

  const handleDelete = async (id: string): Promise<void> => {
    await fetch(`/api/courses/${id}`, { method: "DELETE" });
    await fetchCourses();
  };

  const handleEdit = (course: Course): void => {
    setEditingCourse(course);
    setViewMode("edit");
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 16px" }}>
      <div
        style={{
          position: "fixed",
          bottom: 8,
          right: 8,
          background: "#f00",
          color: "#fff",
          fontSize: 11,
          padding: "2px 6px",
          borderRadius: 4,
          zIndex: 9999,
          fontFamily: "monospace",
        }}
      >
        build #5
      </div>
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>Parent Dashboard</h1>

      <div
        style={{
          display: "flex",
          gap: 0,
          marginBottom: 24,
          borderBottom: "2px solid var(--border)",
        }}
      >
        {(["courses", "progress"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: "none",
              color: tab === t ? "var(--primary)" : "var(--text-muted)",
              borderBottom:
                tab === t ? "2px solid var(--primary)" : "2px solid transparent",
              borderRadius: 0,
              padding: "8px 20px",
              fontSize: 14,
              fontWeight: tab === t ? 600 : 400,
              cursor: "pointer",
              marginBottom: -2,
            }}
          >
            {t === "courses" ? "Courses" : "Student Progress"}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        {tab === "courses" && viewMode === "list" && (
          <button
            className="primary"
            onClick={() => setViewMode("create")}
            style={{ alignSelf: "center" }}
          >
            + New Course
          </button>
        )}
      </div>

      {tab === "progress" && !loading && (
        <StudentProgress courses={courses} />
      )}

      {tab === "courses" && viewMode === "create" && (
        <div
          style={{
            background: "var(--card-bg)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: 24,
          }}
        >
          <h2 style={{ fontSize: 18, marginBottom: 16 }}>Create New Course</h2>
          <CourseForm
            onSave={handleCreate}
            onCancel={() => setViewMode("list")}
          />
        </div>
      )}

      {tab === "courses" && viewMode === "edit" && editingCourse && (
        <div
          style={{
            background: "var(--card-bg)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: 24,
          }}
        >
          <h2 style={{ fontSize: 18, marginBottom: 16 }}>Edit Course</h2>
          <CourseForm
            course={editingCourse}
            onSave={handleUpdate}
            onCancel={() => {
              setViewMode("list");
              setEditingCourse(undefined);
            }}
          />
        </div>
      )}

      {tab === "courses" && viewMode === "list" && (
        <>
          {!loading && <CourseAssigner courses={courses} />}
          {loading && <p>Loading courses...</p>}
          {!loading && courses.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: 48,
                color: "var(--text-muted)",
              }}
            >
              <p style={{ fontSize: 16, marginBottom: 8 }}>No courses yet!</p>
              <p style={{ fontSize: 14 }}>
                Click &quot;+ New Course&quot; to create your first course.
              </p>
            </div>
          )}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            {courses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
