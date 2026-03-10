"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { APP_USERS } from "@/types/user";
import { authenticate, login } from "@/lib/auth";

export default function LoginPage(): React.ReactElement {
  const router = useRouter();
  const [selectedUser, setSelectedUser] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    setError("");

    if (!selectedUser) {
      setError("בחרו משתמש");
      return;
    }

    if (!authenticate(selectedUser, password)) {
      setError("סיסמה שגויה");
      return;
    }

    login(selectedUser);
    const user = APP_USERS.find((u) => u.id === selectedUser);
    router.push(user?.role === "parent" ? "/dashboard" : "/student");
  }

  return (
    <div
      dir="rtl"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: 40,
          width: "100%",
          maxWidth: 380,
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            textAlign: "center",
            marginBottom: 8,
            color: "var(--text)",
          }}
        >
          BobrovFunSchool
        </h1>
        <p
          style={{
            textAlign: "center",
            color: "var(--text-muted)",
            marginBottom: 32,
            fontSize: 14,
          }}
        >
          ברוכים הבאים! בחרו משתמש והזינו סיסמה
        </p>

        <form onSubmit={handleSubmit}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              marginBottom: 20,
            }}
          >
            {APP_USERS.map((user) => {
              const isSelected = user.id === selectedUser;
              return (
                <button
                  type="button"
                  key={user.id}
                  onClick={() => {
                    setSelectedUser(user.id);
                    setError("");
                  }}
                  style={{
                    background: isSelected ? "var(--primary)" : "#f3f4f6",
                    color: isSelected ? "#fff" : "var(--text)",
                    border: isSelected
                      ? "2px solid var(--primary)"
                      : "2px solid transparent",
                    borderRadius: 10,
                    padding: "14px 8px",
                    fontSize: 15,
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <span style={{ fontSize: 24 }}>
                    {user.role === "parent" ? "👨‍👩‍👧" : "🧒"}
                  </span>
                  <span>{user.nameHe}</span>
                  <span
                    style={{
                      fontSize: 11,
                      opacity: 0.7,
                    }}
                  >
                    {user.role === "parent" ? "הורה" : "תלמיד/ה"}
                  </span>
                </button>
              );
            })}
          </div>

          <div style={{ marginBottom: 20 }}>
            <input
              type="password"
              placeholder="סיסמה"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              style={{
                width: "100%",
                padding: "12px 14px",
                fontSize: 16,
                textAlign: "center",
                borderRadius: 10,
              }}
            />
          </div>

          {error && (
            <p
              style={{
                color: "var(--danger)",
                textAlign: "center",
                marginBottom: 16,
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            className="primary"
            style={{
              width: "100%",
              padding: "12px",
              fontSize: 16,
              fontWeight: 600,
              borderRadius: 10,
            }}
          >
            כניסה
          </button>
        </form>
      </div>
    </div>
  );
}
