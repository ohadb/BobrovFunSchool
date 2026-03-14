"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { ChatMessage } from "@/types/chat";
import { getCurrentUserId } from "@/lib/auth";
import { APP_USERS } from "@/types/user";

interface LessonChatProps {
  courseId: string;
  lessonId: string;
  lessonTitle: string;
  lessonContent: string;
  hasExam: boolean;
  isHebrew?: boolean;
  onBack: () => void;
}

const CONFETTI_COLORS = ["#f97316", "#fbbf24", "#34d399", "#60a5fa", "#f472b6", "#a78bfa", "#fb923c"];

function Confetti(): React.ReactElement {
  const pieces = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    delay: Math.random() * 2,
    size: 6 + Math.random() * 8,
    shape: Math.random() > 0.5 ? "circle" : "square",
  }));

  return (
    <>
      {pieces.map((p) => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            background: p.color,
            width: p.size,
            height: p.size,
            borderRadius: p.shape === "circle" ? "50%" : "2px",
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </>
  );
}

function ThinkingDots(): React.ReactElement {
  return (
    <div
      style={{
        alignSelf: "flex-end",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 16px",
        background: "#fff7ed",
        border: "1px solid #fed7aa",
        borderRadius: "16px 16px 4px 16px",
      }}
    >
      <span style={{ fontSize: 20 }}>👩‍🏫</span>
      <div className="thinking-dots">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

export default function LessonChat({
  courseId,
  lessonId,
  lessonTitle,
  hasExam,
  isHebrew,
  onBack,
}: LessonChatProps): React.ReactElement {
  const studentId = getCurrentUserId();
  const studentName =
    APP_USERS.find((u) => u.id === studentId)?.nameHe ?? studentId;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [examStarted, setExamStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [llmDebug, setLlmDebug] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback((): void => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    const startTime = Date.now();
    return (): void => {
      const seconds = Math.round((Date.now() - startTime) / 1000);
      if (seconds > 0) {
        navigator.sendBeacon(
          "/api/usage",
          new Blob([JSON.stringify({ studentId, seconds })], {
            type: "application/json",
          }),
        );
      }
    };
  }, [studentId]);

  // Check for exam score in messages to trigger confetti
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role === "assistant" && lastMsg.content.match(/\[SCORE:\s*\d+\/\d+\]/)) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [messages]);

  useEffect(() => {
    let cancelled = false;

    async function loadHistory(): Promise<void> {
      const res = await fetch(
        `/api/chat/history?studentId=${studentId}&courseId=${courseId}&lessonId=${lessonId}`,
      );
      const data = (await res.json()) as ChatMessage[];

      if (cancelled) return;

      if (data.length > 0) {
        setMessages(data);
        setLoadingHistory(false);
      } else {
        setLoadingHistory(false);
        await sendGreeting();
      }
    }

    async function sendGreeting(): Promise<void> {
      if (cancelled) return;
      setSending(true);
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId,
            studentName,
            courseId,
            lessonId,
            message: "!שלום! אני מוכן ללמוד את השיעור הזה",
          }),
        });
        if (!res.ok) {
          const errBody = await res.text();
          throw new Error(`API ${res.status}: ${errBody}`);
        }
        const data = (await res.json()) as ChatMessage & { llmDebug?: string };
        const { llmDebug: debugInfo, ...greeting } = data;
        if (cancelled) return;
        if (debugInfo) setLlmDebug(debugInfo);

        setMessages([
          {
            role: "user",
            content: "!שלום! אני מוכן ללמוד את השיעור הזה",
            timestamp: new Date().toISOString(),
          },
          greeting,
        ]);
      } catch (err) {
        if (!cancelled) {
          setMessages([]);
          setError(`Greeting failed: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
      if (!cancelled) setSending(false);
    }

    loadHistory();

    return (): void => {
      cancelled = true;
    };
  }, [courseId, lessonId]);

  function handleStop(): void {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setMessages((prev) => prev.slice(0, -1));
    fetch(
      `/api/chat/history?studentId=${studentId}&courseId=${courseId}&lessonId=${lessonId}`,
      { method: "PATCH" },
    );
    setSending(false);
  }

  async function handleSend(): Promise<void> {
    const text = input.trim();
    if (!text || sending) return;

    const userMsg: ChatMessage = {
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          courseId,
          lessonId,
          message: text,
          examMode: examStarted,
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`API ${res.status}: ${errBody}`);
      }
      const data = (await res.json()) as ChatMessage & { llmDebug?: string };
      const { llmDebug: debugInfo, ...reply } = data;
      if (debugInfo) setLlmDebug(debugInfo);
      setMessages((prev) => [...prev, reply]);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(`Send failed: ${err instanceof Error ? err.message : String(err)}`);
    }
    abortRef.current = null;
    setSending(false);
  }

  async function handleStartExam(): Promise<void> {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setExamStarted(true);
    setSending(true);
    setError(null);

    const examMsg = "!אני רוצה להיבחן עכשיו";
    const userMsg: ChatMessage = {
      role: "user",
      content: examMsg,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          studentName,
          courseId,
          lessonId,
          message: examMsg,
          examMode: true,
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`API ${res.status}: ${errBody}`);
      }
      const data = (await res.json()) as ChatMessage & { llmDebug?: string };
      const { llmDebug: debugInfo, ...reply } = data;
      if (debugInfo) setLlmDebug(debugInfo);
      setMessages((prev) => [...prev, reply]);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(`Exam failed: ${err instanceof Error ? err.message : String(err)}`);
    }
    abortRef.current = null;
    setSending(false);
  }

  async function handleReset(): Promise<void> {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setSending(true);
    setMessages([]);
    setExamStarted(false);
    setError(null);

    try {
      await fetch(
        `/api/chat/history?studentId=${studentId}&courseId=${courseId}&lessonId=${lessonId}`,
        { method: "DELETE" },
      );

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          studentName,
          courseId,
          lessonId,
          message: "!שלום! אני מוכן ללמוד את השיעור הזה",
        }),
      });
      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`API ${res.status}: ${errBody}`);
      }
      const data = (await res.json()) as ChatMessage & { llmDebug?: string };
      const { llmDebug: debugInfo, ...greeting } = data;
      if (debugInfo) setLlmDebug(debugInfo);
      setMessages([
        {
          role: "user",
          content: "!שלום! אני מוכן ללמוד את השיעור הזה",
          timestamp: new Date().toISOString(),
        },
        greeting,
      ]);
    } catch (err) {
      setError(`Reset failed: ${err instanceof Error ? err.message : String(err)}`);
    }
    setSending(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div
      dir="rtl"
      className="student-theme student-chat"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 80px)",
        maxWidth: 700,
        margin: "0 auto",
        padding: "16px 16px 0",
      }}
    >
      {showConfetti && <Confetti />}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 16,
          background: "#fff",
          padding: "12px 16px",
          borderRadius: 16,
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: "#fff7ed",
            border: "2px solid #fed7aa",
            borderRadius: 10,
            padding: "6px 14px",
            fontSize: 13,
            fontWeight: 600,
            color: "#f97316",
            cursor: "pointer",
          }}
        >
          חזרה →
        </button>
        <button
          onClick={handleReset}
          disabled={loadingHistory}
          style={{
            background: "#fef2f2",
            border: "2px solid #fecaca",
            borderRadius: 10,
            padding: "6px 14px",
            fontSize: 13,
            fontWeight: 600,
            color: "#ef4444",
            cursor: "pointer",
            opacity: loadingHistory ? 0.5 : 1,
          }}
        >
          להתחיל מחדש
        </button>
        <h2 style={{ fontSize: 17, flex: 1, color: "#1c1917" }}>
          📖 {lessonTitle}
        </h2>
        {hasExam && (
          <button
            onClick={handleStartExam}
            disabled={loadingHistory}
            style={{
              background: "linear-gradient(135deg, #f97316, #fb923c)",
              border: "none",
              borderRadius: 10,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 700,
              color: "#fff",
              cursor: "pointer",
              whiteSpace: "nowrap",
              opacity: loadingHistory ? 0.5 : 1,
            }}
          >
            📝 אני רוצה להיבחן
          </button>
        )}
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          paddingBottom: 16,
        }}
      >
        {loadingHistory && (
          <div style={{ textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📖</div>
            <p style={{ color: "#78716c" }}>טוען צ׳אט...</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              flexDirection: isHebrew
                ? msg.role === "user" ? "row" : "row-reverse"
                : msg.role === "user" ? "row-reverse" : "row",
              alignItems: "flex-end",
              gap: 8,
              maxWidth: "85%",
              alignSelf:
                isHebrew
                  ? msg.role === "user" ? "flex-start" : "flex-end"
                  : msg.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            {msg.role === "assistant" && (
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #fbbf24, #f97316)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  flexShrink: 0,
                }}
              >
                👩‍🏫
              </div>
            )}
            <div
              style={{
                padding: "12px 16px",
                borderRadius: msg.role === "user"
                  ? "16px 16px 16px 4px"
                  : "16px 16px 4px 16px",
                background: msg.role === "user"
                  ? "linear-gradient(135deg, #f97316, #fb923c)"
                  : "#fff7ed",
                color: msg.role === "user" ? "white" : "#1c1917",
                border: msg.role === "assistant" ? "1px solid #fed7aa" : "none",
                fontSize: 15,
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              }}
            >
              {msg.content}
              {msg.images && msg.images.length > 0 && (
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                  {msg.images.map((imgId) => (
                    <img
                      key={imgId}
                      src={`/api/image/${imgId}`}
                      alt="illustration"
                      style={{
                        maxWidth: "100%",
                        borderRadius: 12,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {error && (
          <div
            style={{
              alignSelf: "center",
              background: "#fef2f2",
              border: "2px solid #fecaca",
              borderRadius: 16,
              padding: "20px 24px",
              maxWidth: "90%",
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: 24, marginBottom: 8 }}>😰</p>
            <p style={{ fontSize: 16, fontWeight: 600, color: "#b91c1c", marginBottom: 8 }}>
              אוי לא, משהו השתבש!
            </p>
            <p style={{ fontSize: 14, color: "#b91c1c", marginBottom: 12 }}>
              תדברו עם אבא המדהים שלכם
            </p>
            <p
              style={{
                fontSize: 11,
                color: "#999",
                background: "#f9fafb",
                padding: 8,
                borderRadius: 8,
                fontFamily: "monospace",
                wordBreak: "break-all",
                textAlign: "left",
                direction: "ltr",
              }}
            >
              {error}
            </p>
          </div>
        )}

        {sending && <ThinkingDots />}

        <div ref={bottomRef} />
      </div>

      {llmDebug && (
        <div
          style={{
            position: "fixed",
            bottom: 8,
            left: 8,
            background: "#333",
            color: "#0f0",
            fontSize: 11,
            padding: "4px 8px",
            borderRadius: 4,
            zIndex: 9999,
            fontFamily: "monospace",
            direction: "ltr",
          }}
        >
          {llmDebug}
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: 8,
          padding: "12px 0 16px",
          borderTop: "1px solid #fed7aa",
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="כתבו הודעה... ✏️"
          disabled={sending}
          style={{
            flex: 1,
            padding: "12px 16px",
            border: "2px solid #fed7aa",
            borderRadius: 14,
            fontSize: 15,
            fontFamily: "inherit",
            background: "#fff",
          }}
        />
        <button
          onClick={handleSend}
          disabled={sending || !input.trim()}
          style={{
            background: sending || !input.trim()
              ? "#e5e7eb"
              : "linear-gradient(135deg, #f97316, #fb923c)",
            border: "none",
            borderRadius: 14,
            padding: "12px 20px",
            fontSize: 16,
            fontWeight: 700,
            color: sending || !input.trim() ? "#9ca3af" : "#fff",
            cursor: sending || !input.trim() ? "default" : "pointer",
          }}
        >
          🚀
        </button>
      </div>
    </div>
  );
}
