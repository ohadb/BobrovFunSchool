import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import type { LlmBackend } from "@/types/course";

const anthropic = new Anthropic();
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? "" });

const GEMINI_TEXT_MODEL = "gemini-3.1-pro-preview";
const GEMINI_IMAGE_MODEL = "gemini-3.1-flash-image-preview";

// Appended to the system prompt when images are enabled. The text model cannot
// render images itself, so it emits markers that we resolve via the image model.
const IMAGE_MARKER_INSTRUCTION = `

You cannot render images yourself. Whenever an illustration is required or would help, embed a marker in your reply of the form [[IMAGE: short English description of the visual]]. A separate image model will render it and the picture will be shown alongside your text. Never mention this mechanism or the marker to the user.`;

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
  const model = backend === "gemini" ? GEMINI_TEXT_MODEL : "claude-sonnet-5";
  console.log(
    `[${backend}] REQUEST model=${model} systemPrompt=${systemPrompt.length}chars`,
  );
  const start = Date.now();
  try {
    const result =
      backend === "gemini"
        ? await geminiCompletion(systemPrompt, messages, enableImages)
        : await claudeCompletion(systemPrompt, messages);
    const elapsed = Date.now() - start;
    console.log(
      `[${backend}] RESPONSE ${elapsed}ms text=${result.text.length}chars images=${result.images.length}`,
    );
    return result;
  } catch (err) {
    const elapsed = Date.now() - start;
    console.error(`[${backend}] ERROR ${elapsed}ms`, err);
    throw err;
  }
}

async function claudeCompletion(
  systemPrompt: string,
  messages: { role: "user" | "assistant"; content: string }[],
): Promise<LlmResult> {
  const model = "claude-sonnet-5";
  const response = await anthropic.messages.create({
    model,
    max_tokens: 1024,
    // Sonnet 5 runs adaptive thinking by default when `thinking` is omitted;
    // disable it so short tutoring replies stay fast and within max_tokens.
    thinking: { type: "disabled" },
    system: systemPrompt,
    messages,
  });
  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  return {
    text,
    images: [],
    debug: `Anthropic → ${model} (id: ${response.id})`,
  };
}

async function geminiGenerateImage(
  description: string,
): Promise<LlmImage | null> {
  const start = Date.now();
  try {
    const response = await genAI.models.generateContent({
      model: GEMINI_IMAGE_MODEL,
      contents: [
        {
          role: "user",
          parts: [{ text: `Generate a single image: ${description}` }],
        },
      ],
      config: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: {
          imageSize: "1K",
        },
      },
    });
    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData) {
        console.log(
          `[gemini-image] rendered "${description.slice(0, 60)}" in ${Date.now() - start}ms`,
        );
        return {
          base64: part.inlineData.data ?? "",
          mimeType: part.inlineData.mimeType ?? "image/png",
        };
      }
    }
    console.warn(
      `[gemini-image] no image returned for "${description.slice(0, 60)}"`,
    );
    return null;
  } catch (err) {
    console.error(
      `[gemini-image] FAILED for "${description.slice(0, 60)}"`,
      err,
    );
    return null;
  }
}

async function resolveImageMarkers(
  rawText: string,
): Promise<{ text: string; images: LlmImage[] }> {
  const markerRegex = /\[\[IMAGE:([^\]]*)\]\]/g;
  const descriptions = [...rawText.matchAll(markerRegex)]
    .map((m) => m[1].trim())
    .filter((d) => d.length > 0);
  const text = rawText.replace(markerRegex, "").trim();
  if (descriptions.length === 0) return { text, images: [] };

  const rendered = await Promise.all(descriptions.map(geminiGenerateImage));
  return {
    text,
    images: rendered.filter((img): img is LlmImage => img !== null),
  };
}

async function geminiCompletion(
  systemPrompt: string,
  messages: { role: "user" | "assistant"; content: string }[],
  enableImages?: boolean,
): Promise<LlmResult> {
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  console.log(
    `[gemini] REQUEST model=${GEMINI_TEXT_MODEL} systemPrompt=${systemPrompt.length}chars images=${enableImages ?? false}`,
  );
  console.log(
    `[gemini] USER MESSAGE:\n${messages.map((m) => m.content).join("\n---\n")}`,
  );

  const response = await genAI.models.generateContent({
    model: GEMINI_TEXT_MODEL,
    contents,
    config: {
      systemInstruction: enableImages
        ? systemPrompt + IMAGE_MARKER_INSTRUCTION
        : systemPrompt,
    },
  });

  let rawText = "";
  for (const part of response.candidates?.[0]?.content?.parts ?? []) {
    if (part.text) rawText += part.text;
  }

  const { text, images } = enableImages
    ? await resolveImageMarkers(rawText)
    : { text: rawText, images: [] };

  return {
    text,
    images,
    debug: `Google GenAI → ${GEMINI_TEXT_MODEL}${images.length > 0 ? ` + ${GEMINI_IMAGE_MODEL} (${images.length} img)` : ""}`,
  };
}

export async function geminiExamCompletion(
  systemPrompt: string,
  userMessage: string,
  enableImages?: boolean,
): Promise<LlmResult> {
  console.log(
    `[gemini-exam] REQUEST model=${GEMINI_TEXT_MODEL} systemPrompt=${systemPrompt.length}chars images=${enableImages ?? false}`,
  );
  const start = Date.now();

  const response = await genAI.models.generateContent({
    model: GEMINI_TEXT_MODEL,
    contents: [{ role: "user", parts: [{ text: userMessage }] }],
    config: {
      systemInstruction: enableImages
        ? systemPrompt + IMAGE_MARKER_INSTRUCTION
        : systemPrompt,
    },
  });

  let rawText = "";
  for (const part of response.candidates?.[0]?.content?.parts ?? []) {
    if (part.text) rawText += part.text;
  }

  const { text, images } = enableImages
    ? await resolveImageMarkers(rawText)
    : { text: rawText, images: [] };

  const elapsed = Date.now() - start;
  console.log(
    `[gemini-exam] RESPONSE ${elapsed}ms text=${text.length}chars images=${images.length}`,
  );

  return {
    text,
    images,
    debug: `Google GenAI → ${GEMINI_TEXT_MODEL}${images.length > 0 ? ` + ${GEMINI_IMAGE_MODEL} (${images.length} img)` : ""}`,
  };
}
