"use client";

import { useRouter, usePathname } from "next/navigation";

const USER_TYPES = [
  { label: "Parent", path: "/dashboard" },
  { label: "Student", path: "/student" },
];

export default function DebugUserPicker(): React.ReactElement {
  const router = useRouter();
  const pathname = usePathname();

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
      <span style={{ color: "#f00", fontWeight: "bold", marginRight: 4 }}>
        DEBUG
      </span>
      <span style={{ color: "#aaa" }}>View as:</span>
      {USER_TYPES.map(({ label, path }) => {
        const active = pathname.startsWith(path);
        return (
          <button
            key={path}
            onClick={() => router.push(path)}
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
            {label}
          </button>
        );
      })}
    </div>
  );
}
