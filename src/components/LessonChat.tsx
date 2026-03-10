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
  onBack: () => void;
}

export default function LessonChat({
  courseId,
  lessonId,
  lessonTitle,
  hasExam,
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
  const bottomRef = useRef<HTMLDivElement>(null);

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
      const greeting = (await res.json()) as ChatMessage;
      if (cancelled) return;

      setMessages([
        {
          role: "user",
          content: "!שלום! אני מוכן ללמוד את השיעור הזה",
          timestamp: new Date().toISOString(),
        },
        greeting,
      ]);
      setSending(false);
    }

    loadHistory();

    return (): void => {
      cancelled = true;
    };
  }, [courseId, lessonId]);

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
    });
    const reply = (await res.json()) as ChatMessage;
    setMessages((prev) => [...prev, reply]);
    setSending(false);
  }

  async function handleStartExam(): Promise<void> {
    if (sending) return;
    setExamStarted(true);

    const examMsg = "!אני רוצה להיבחן עכשיו";
    const userMsg: ChatMessage = {
      role: "user",
      content: examMsg,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId,
        courseId,
        lessonId,
        message: examMsg,
        examMode: true,
      }),
    });
    const reply = (await res.json()) as ChatMessage;
    setMessages((prev) => [...prev, reply]);
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
        <h2 style={{ fontSize: 18, flex: 1 }}>{lessonTitle}</h2>
        {hasExam && !examStarted && (
          <button
            className="primary"
            onClick={handleStartExam}
            disabled={sending || loadingHistory}
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
              alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
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

        {sending && (
          <div
            style={{
              alignSelf: "flex-start",
              color: "var(--text-muted)",
              fontSize: 14,
              padding: "10px 14px",
            }}
          >
            חושב...
          </div>
        )}

        <div ref={bottomRef} />
      </div>

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
