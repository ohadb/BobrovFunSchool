"use client";

import { useState, useEffect, useCallback } from "react";
import type { Course } from "@/types/course";
import { APP_USERS } from "@/types/user";

const STUDENTS = APP_USERS.filter((u) => u.role === "student");

interface CourseAssignerProps {
  courses: Course[];
}

export default function CourseAssigner({
  courses,
}: CourseAssignerProps): React.ReactElement {
  const [assignments, setAssignments] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);

  const loadAssignments = useCallback(async (): Promise<void> => {
    const result: Record<string, string[]> = {};
    for (const student of STUDENTS) {
      const res = await fetch(`/api/assignments?studentId=${student.id}`);
      result[student.id] = (await res.json()) as string[];
    }
    setAssignments(result);
  }, []);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  async function toggleAssignment(
    studentId: string,
    courseId: string,
  ): Promise<void> {
    setSaving(true);
    const isAssigned = assignments[studentId]?.includes(courseId);
    await fetch("/api/assignments", {
      method: isAssigned ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, courseId }),
    });
    await loadAssignments();
    setSaving(false);
  }

  if (courses.length === 0) return <></>;

  return (
    <div
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: 20,
        marginBottom: 24,
      }}
    >
      <h2 style={{ fontSize: 16, marginBottom: 16 }}>Assign Courses to Students</h2>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 14,
        }}
      >
        <thead>
          <tr>
            <th
              style={{
                textAlign: "left",
                padding: "8px 12px",
                borderBottom: "1px solid var(--border)",
              }}
            >
              Course
            </th>
            {STUDENTS.map((s) => (
              <th
                key={s.id}
                style={{
                  textAlign: "center",
                  padding: "8px 12px",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                {s.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {courses.map((course) => (
            <tr key={course.id}>
              <td
                style={{
                  padding: "8px 12px",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                {course.name}
              </td>
              {STUDENTS.map((student) => {
                const isAssigned =
                  assignments[student.id]?.includes(course.id) ?? false;
                return (
                  <td
                    key={student.id}
                    style={{
                      textAlign: "center",
                      padding: "8px 12px",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <button
                      onClick={() => toggleAssignment(student.id, course.id)}
                      disabled={saving}
                      style={{
                        background: isAssigned
                          ? "var(--primary)"
                          : "var(--border)",
                        color: isAssigned ? "white" : "var(--text-muted)",
                        border: "none",
                        borderRadius: 4,
                        padding: "4px 12px",
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                    >
                      {isAssigned ? "Assigned" : "Assign"}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
