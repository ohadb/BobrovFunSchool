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
    // Remove the last user message from UI and server
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
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 80px)",
        maxWidth: 700,
        margin: "0 auto",
        padding: "16px 16px 0",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <button className="secondary" onClick={onBack}>
          חזרה →
        </button>
        <button
          className="danger"
          onClick={handleReset}
          disabled={loadingHistory}
          style={{ fontSize: 13 }}
        >
          להתחיל מחדש
        </button>
        <h2 style={{ fontSize: 18, flex: 1 }}>{lessonTitle}</h2>
        {hasExam && (
          <button
            className="primary"
            onClick={handleStartExam}
            disabled={loadingHistory}
            style={{ whiteSpace: "nowrap" }}
          >
            אני רוצה להיבחן עכשיו
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
          <p style={{ color: "var(--text-muted)", textAlign: "center" }}>
            טוען צ׳אט...
          </p>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              alignSelf:
                isHebrew
                  ? msg.role === "user" ? "flex-start" : "flex-end"
                  : msg.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "80%",
              padding: "10px 14px",
              borderRadius: 12,
              background:
                msg.role === "user" ? "var(--primary)" : "var(--card-bg)",
              color: msg.role === "user" ? "white" : "var(--text)",
              border:
                msg.role === "assistant" ? "1px solid var(--border)" : "none",
              fontSize: 14,
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
            }}
          >
            {msg.content}
          </div>
        ))}

        {error && (
          <div
            style={{
              alignSelf: "center",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 12,
              padding: "16px 20px",
              maxWidth: "90%",
              textAlign: "center",
            }}
          >
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
                borderRadius: 6,
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

        {sending && (
          <div
            style={{
              alignSelf: "flex-start",
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
            }}
          >
            <span style={{ color: "var(--text-muted)", fontSize: 14 }}>
              חושב...
            </span>
            <button
              className="secondary"
              onClick={handleStop}
              style={{ fontSize: 12, padding: "4px 10px" }}
            >
              תפסיק לחשוב
            </button>
          </div>
        )}

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
          borderTop: "1px solid var(--border)",
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="כתבו הודעה..."
          disabled={sending}
          style={{ flex: 1 }}
        />
        <button
          className="primary"
          onClick={handleSend}
          disabled={sending || !input.trim()}
        >
          שלח
        </button>
      </div>
    </div>
  );
}
