"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { APP_USERS } from "@/types/user";

const ROLE_LABELS: Record<string, string> = {
  parent: "הורה",
  student: "תלמיד/ה",
};

export function getCurrentUserId(): string {
  if (typeof window === "undefined") return "ohad";
  return localStorage.getItem("currentUserId") ?? "ohad";
}

export default function DebugUserPicker(): React.ReactElement {
  const router = useRouter();
  const pathname = usePathname();
  const [currentId, setCurrentId] = useState("ohad");

  useEffect(() => {
    setCurrentId(getCurrentUserId());
  }, []);

  function selectUser(userId: string): void {
    const user = APP_USERS.find((u) => u.id === userId);
    if (!user) return;
    localStorage.setItem("currentUserId", userId);
    setCurrentId(userId);
    router.push(user.role === "parent" ? "/dashboard" : "/student");
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: "#1e1e2e",
        borderBottom: "1px solid #444",
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 12px",
        fontSize: 12,
        fontFamily: "monospace",
      }}
    >
      <span style={{ color: "#aaa" }}>משתמש:</span>
      {APP_USERS.map((user) => {
        const active = user.id === currentId;
        return (
          <button
            key={user.id}
            onClick={() => selectUser(user.id)}
            style={{
              background: active ? "#4f46e5" : "#333",
              color: active ? "#fff" : "#aaa",
              border: "none",
              borderRadius: 4,
              padding: "2px 10px",
              fontSize: 12,
              fontFamily: "monospace",
              cursor: "pointer",
            }}
          >
            {user.name} ({ROLE_LABELS[user.role]})
          </button>
        );
      })}
    </div>
  );
}
