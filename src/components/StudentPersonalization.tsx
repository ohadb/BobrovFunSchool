"use client";

import { useState, useEffect } from "react";
import { APP_USERS } from "@/types/user";

const students = APP_USERS.filter((u) => u.role === "student");

export default function StudentPersonalization(): React.ReactElement {
  const [interests, setInterests] = useState<Record<string, string[]>>({});
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load(): Promise<void> {
      const results: Record<string, string[]> = {};
      for (const student of students) {
        const res = await fetch(`/api/interests?studentId=${student.id}`);
        results[student.id] = (await res.json()) as string[];
      }
      setInterests(results);
      setLoading(false);
    }
    load();
  }, []);

  async function addInterest(studentId: string): Promise<void> {
    const text = (inputs[studentId] ?? "").trim();
    if (!text) return;

    const updated = [...(interests[studentId] ?? []), text];
    setInterests((prev) => ({ ...prev, [studentId]: updated }));
    setInputs((prev) => ({ ...prev, [studentId]: "" }));
    setSaving((prev) => ({ ...prev, [studentId]: true }));

    await fetch("/api/interests", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, interests: updated }),
    });
    setSaving((prev) => ({ ...prev, [studentId]: false }));
  }

  async function removeInterest(
    studentId: string,
    index: number,
  ): Promise<void> {
    const updated = (interests[studentId] ?? []).filter((_, i) => i !== index);
    setInterests((prev) => ({ ...prev, [studentId]: updated }));
    setSaving((prev) => ({ ...prev, [studentId]: true }));

    await fetch("/api/interests", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, interests: updated }),
    });
    setSaving((prev) => ({ ...prev, [studentId]: false }));
  }

  if (loading) return <p>Loading...</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {students.map((student) => (
        <div
          key={student.id}
          style={{
            background: "var(--card-bg)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: 24,
          }}
        >
          <h3 style={{ fontSize: 16, marginBottom: 4 }}>
            {student.name} ({student.nameHe})
          </h3>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-muted)",
              marginBottom: 16,
            }}
          >
            Topics of interest — used to personalize lessons and exams
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 12,
            }}
          >
            {(interests[student.id] ?? []).map((topic, i) => (
              <span
                key={i}
                style={{
                  background: "#eef2ff",
                  color: "var(--primary)",
                  padding: "4px 12px",
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {topic}
                <button
                  onClick={() => removeInterest(student.id, i)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--danger)",
                    cursor: "pointer",
                    padding: 0,
                    fontSize: 14,
                    lineHeight: 1,
                  }}
                >
                  x
                </button>
              </span>
            ))}
            {(interests[student.id] ?? []).length === 0 && (
              <span style={{ color: "var(--text-muted)", fontSize: 13 }}>
                No topics yet
              </span>
            )}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={inputs[student.id] ?? ""}
              onChange={(e) =>
                setInputs((prev) => ({
                  ...prev,
                  [student.id]: e.target.value,
                }))
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") addInterest(student.id);
              }}
              placeholder="Add a topic (e.g. dinosaurs, soccer, Minecraft...)"
              style={{ flex: 1 }}
            />
            <button
              className="primary"
              onClick={() => addInterest(student.id)}
              disabled={
                !(inputs[student.id] ?? "").trim() || saving[student.id]
              }
            >
              Add
            </button>
          </div>
          {saving[student.id] && (
            <p
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                marginTop: 4,
              }}
            >
              Saving...
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
