"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getLoggedInUser, logout } from "@/lib/auth";
import type { AppUser } from "@/types/user";

export default function AuthGuard({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement | null {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AppUser | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const loggedIn = getLoggedInUser();

    if (pathname === "/login") {
      setChecked(true);
      return;
    }

    if (!loggedIn) {
      router.replace("/login");
      return;
    }

    // Enforce role-based routing
    if (loggedIn.role === "student" && pathname.startsWith("/dashboard")) {
      router.replace("/student");
      return;
    }
    if (loggedIn.role === "parent" && pathname.startsWith("/student")) {
      router.replace("/dashboard");
      return;
    }

    setUser(loggedIn);
    setChecked(true);
  }, [pathname, router]);

  if (!checked) return null;

  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <>
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
          fontSize: 13,
          direction: "rtl",
        }}
      >
        <span style={{ color: "#ccc", fontWeight: 500 }}>{user?.nameHe}</span>
        <span style={{ color: "#888", fontSize: 11 }}>
          ({user?.role === "parent" ? "הורה" : "תלמיד/ה"})
        </span>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => {
            logout();
            router.push("/login");
          }}
          style={{
            background: "#333",
            color: "#aaa",
            border: "none",
            borderRadius: 4,
            padding: "2px 12px",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          יציאה
        </button>
      </div>
      <div style={{ paddingTop: 36 }}>{children}</div>
    </>
  );
}
