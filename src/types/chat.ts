export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface ChatSession {
  courseId: string;
  lessonId: string;
  messages: ChatMessage[];
}

export interface ChatRequestBody {
  courseId: string;
  lessonId: string;
  message: string;
  examMode?: boolean;
}
