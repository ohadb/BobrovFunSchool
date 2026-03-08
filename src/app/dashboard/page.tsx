"use client";

import { useState, useEffect, useCallback } from "react";
import type { Course, CourseLanguage } from "@/types/course";
import CourseCard from "@/components/CourseCard";
import CourseForm from "@/components/CourseForm";

type ViewMode = "list" | "create" | "edit";

export default function Dashboard(): React.ReactElement {
  const [courses, setCourses] = useState<Course[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [editingCourse, setEditingCourse] = useState<Course | undefined>(
    undefined,
  );
  const [loading, setLoading] = useState(true);

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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <h1 style={{ fontSize: 24 }}>Parent school dashboard</h1>
        {viewMode === "list" && (
          <button className="primary" onClick={() => setViewMode("create")}>
            + New Course
          </button>
        )}
      </div>

      {viewMode === "create" && (
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

      {viewMode === "edit" && editingCourse && (
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

      {viewMode === "list" && (
        <>
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
