"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { ChatMessage } from "@/types/chat";
import { getCurrentUserId } from "@/lib/auth";
import { APP_USERS } from "@/types/user";

interface Theme {
  id: string;
  label: string;
  gradient: string;
  primary: string;
  primaryHover: string;
  border: string;
  bubbleBg: string;
}

const DEFAULT_THEME: Theme = {
  id: "warm", label: "🧡",
  gradient: "linear-gradient(135deg, #fef3c7 0%, #fce7f3 50%, #dbeafe 100%)",
  primary: "#f97316", primaryHover: "#ea580c", border: "#fed7aa", bubbleBg: "#fff7ed",
};

interface LessonChatProps {
  courseId: string;
  lessonId: string;
  lessonTitle: string;
  lessonContent: string;
  hasExam: boolean;
  isHebrew?: boolean;
  theme?: Theme;
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
  theme: themeProp,
  onBack,
}: LessonChatProps): React.ReactElement {
  const theme = themeProp ?? DEFAULT_THEME;
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
    setExamStarted(false);
    setError(null);

    const resumeMsg = "!בוא נחזור ללמוד את השיעור";
    const userMsg: ChatMessage = {
      role: "user",
      content: resumeMsg,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          studentName,
          courseId,
          lessonId,
          message: resumeMsg,
        }),
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
      className="student-chat"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 80px)",
        maxWidth: 700,
        margin: "0 auto",
        padding: "16px 16px 0",
        background: theme.gradient,
        fontFamily: "'Nunito', 'Rubik', -apple-system, sans-serif",
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
          borderRadius: 18,
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: theme.bubbleBg,
            border: `2px solid ${theme.border}`,
            borderRadius: 12,
            padding: "8px 16px",
            fontSize: 14,
            fontWeight: 700,
            color: theme.primary,
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
            borderRadius: 12,
            padding: "8px 16px",
            fontSize: 14,
            fontWeight: 700,
            color: "#ef4444",
            cursor: "pointer",
            opacity: loadingHistory ? 0.5 : 1,
          }}
        >
          להתחיל מחדש
        </button>
        <h2 style={{ fontSize: 18, flex: 1, color: "#1c1917", fontWeight: 800 }}>
          📖 {lessonTitle}
        </h2>
        {hasExam && (
          <button
            onClick={handleStartExam}
            disabled={loadingHistory || sending}
            style={{
              background: `linear-gradient(135deg, ${theme.primary}, ${theme.primaryHover})`,
              border: "none",
              borderRadius: 12,
              padding: "10px 18px",
              fontSize: 14,
              fontWeight: 800,
              color: "#fff",
              cursor: loadingHistory || sending ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
              opacity: loadingHistory || sending ? 0.5 : 1,
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
          gap: 14,
          paddingBottom: 16,
        }}
      >
        {loadingHistory && (
          <div style={{ textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📖</div>
            <p style={{ color: "#78716c", fontSize: 16 }}>טוען צ׳אט...</p>
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
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, #fbbf24, ${theme.primary})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  flexShrink: 0,
                  boxShadow: `0 2px 6px ${theme.primary}30`,
                }}
              >
                👩‍🏫
              </div>
            )}
            <div
              style={{
                padding: "14px 18px",
                borderRadius: msg.role === "user"
                  ? "18px 18px 18px 4px"
                  : "18px 18px 4px 18px",
                background: msg.role === "user"
                  ? `linear-gradient(135deg, ${theme.primary}, ${theme.primaryHover})`
                  : theme.bubbleBg,
                color: msg.role === "user" ? "white" : "#1c1917",
                border: msg.role === "assistant" ? `1px solid ${theme.border}` : "none",
                fontSize: 16,
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",
                boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
              }}
            >
              {msg.content}
              {msg.images && msg.images.length > 0 && (
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                  {msg.images.map((imgId) => (
                    <img
                      key={imgId}
                      src={`/api/image/${imgId}`}
                      alt="illustration"
                      style={{
                        maxWidth: "100%",
                        borderRadius: 14,
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
              borderRadius: 18,
              padding: "24px 28px",
              maxWidth: "90%",
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: 28, marginBottom: 8 }}>😰</p>
            <p style={{ fontSize: 18, fontWeight: 700, color: "#b91c1c", marginBottom: 8 }}>
              אוי לא, משהו השתבש!
            </p>
            <p style={{ fontSize: 15, color: "#b91c1c", marginBottom: 12 }}>
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
          gap: 10,
          padding: "14px 0 18px",
          borderTop: `1px solid ${theme.border}`,
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
            padding: "14px 18px",
            border: `2px solid ${theme.border}`,
            borderRadius: 16,
            fontSize: 16,
            fontFamily: "inherit",
            background: "#fff",
          }}
        />
        {sending ? (
          <button
            onClick={handleStop}
            style={{
              background: "linear-gradient(135deg, #ef4444, #dc2626)",
              border: "none",
              borderRadius: 16,
              padding: "14px 22px",
              fontSize: 18,
              fontWeight: 800,
              color: "#fff",
              cursor: "pointer",
              boxShadow: "0 2px 8px #ef444440",
            }}
          >
            ⏹️
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            style={{
              background: !input.trim()
                ? "#e5e7eb"
                : `linear-gradient(135deg, ${theme.primary}, ${theme.primaryHover})`,
              border: "none",
              borderRadius: 16,
              padding: "14px 22px",
              fontSize: 18,
              fontWeight: 800,
              color: !input.trim() ? "#9ca3af" : "#fff",
              cursor: !input.trim() ? "default" : "pointer",
              boxShadow: !input.trim() ? "none" : `0 2px 8px ${theme.primary}40`,
            }}
          >
            🚀
          </button>
        )}
      </div>
    </div>
  );
}
