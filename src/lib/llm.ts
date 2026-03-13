import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { LlmBackend } from "@/types/course";

const anthropic = new Anthropic();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

export interface LlmResult {
  text: string;
  debug: string;
}

export async function chatCompletion(
  backend: LlmBackend,
  systemPrompt: string,
  messages: { role: "user" | "assistant"; content: string }[],
): Promise<LlmResult> {
  if (backend === "gemini") {
    return geminiCompletion(systemPrompt, messages);
  }
  return claudeCompletion(systemPrompt, messages);
}

async function claudeCompletion(
  systemPrompt: string,
  messages: { role: "user" | "assistant"; content: string }[],
): Promise<LlmResult> {
  const model = "claude-sonnet-4-20250514";
  const response = await anthropic.messages.create({
    model,
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  });
  const text = response.content[0].type === "text" ? response.content[0].text : "";
  return {
    text,
    debug: `Anthropic → ${model} (id: ${response.id})`,
  };
}

async function geminiCompletion(
  systemPrompt: string,
  messages: { role: "user" | "assistant"; content: string }[],
): Promise<LlmResult> {
  const modelName = "gemini-2.5-flash";
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: systemPrompt,
  });

  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const chat = model.startChat({ history });
  const lastMessage = messages[messages.length - 1].content;
  const result = await chat.sendMessage(lastMessage);
  return {
    text: result.response.text(),
    debug: `Google GenAI → ${modelName}`,
  };
}
