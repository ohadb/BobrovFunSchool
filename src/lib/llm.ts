import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import type { LlmBackend } from "@/types/course";

const anthropic = new Anthropic();
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? "" });

export interface LlmImage {
  base64: string;
  mimeType: string;
}

export interface LlmResult {
  text: string;
  images: LlmImage[];
  debug: string;
}

export async function chatCompletion(
  backend: LlmBackend,
  systemPrompt: string,
  messages: { role: "user" | "assistant"; content: string }[],
  enableImages?: boolean,
): Promise<LlmResult> {
  if (backend === "gemini") {
    return geminiCompletion(systemPrompt, messages, enableImages);
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
    images: [],
    debug: `Anthropic → ${model} (id: ${response.id})`,
  };
}

async function geminiCompletion(
  systemPrompt: string,
  messages: { role: "user" | "assistant"; content: string }[],
  enableImages?: boolean,
): Promise<LlmResult> {
  const modelName = "gemini-3.1-flash-image-preview";

  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const response = await genAI.models.generateContent({
    model: modelName,
    contents,
    config: {
      systemInstruction: systemPrompt,
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig: {
        imageSize: "1K",
        numberOfImages: 1,
      },
    },
  });

  let text = "";
  const images: LlmImage[] = [];

  if (response.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.text) {
        text += part.text;
      } else if (part.inlineData) {
        images.push({
          base64: part.inlineData.data ?? "",
          mimeType: part.inlineData.mimeType ?? "image/png",
        });
      }
    }
  }

  return {
    text,
    images,
    debug: `Google GenAI → ${modelName}${images.length > 0 ? ` (${images.length} img)` : ""}`,
  };
}
