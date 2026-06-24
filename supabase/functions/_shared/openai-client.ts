// Shared OpenAI client helper for Supabase Edge Functions (Deno).
// Uses npm:openai with structured outputs (Zod schemas via zodResponseFormat).
// Pinned to a known-good version to avoid API surface changes on the runtime.

import OpenAI from "npm:openai@4.77.0";
import { zodResponseFormat } from "npm:openai@4.77.0/helpers/zod";
import type { z } from "npm:zod@3.24.1";

function getClient(): OpenAI {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  return new OpenAI({ apiKey });
}

export const DEFAULT_MODEL = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";

/**
 * Generate a structured response from OpenAI using a Zod schema.
 * Uses beta.chat.completions.parse() with zodResponseFormat for structured
 * outputs. Falls back to chat.completions.create() with JSON mode if the
 * beta.parse API is unavailable on the resolved SDK version.
 */
export async function generateStructured<T>(
  schema: z.ZodType<T>,
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  options: { model?: string; temperature?: number } = {}
): Promise<T> {
  const client = getClient();
  const model = options.model ?? DEFAULT_MODEL;
  const temperature = options.temperature ?? 0.7;

  // Try the structured-output parse API first.
  if (client.beta?.chat?.completions?.parse) {
    const response = await client.beta.chat.completions.parse({
      model,
      messages,
      temperature,
      response_format: zodResponseFormat(schema, "result"),
    });

    const parsed = response.choices[0]?.message?.parsed;
    if (!parsed) {
      throw new Error("OpenAI returned no parsed structured output");
    }
    return parsed;
  }

  // Fallback: use JSON mode + manual Zod validation.
  const response = await client.chat.completions.create({
    model,
    messages: [
      ...messages,
      {
        role: "system",
        content:
          "Respond with a JSON object that matches this schema. Do not include any text outside the JSON.",
      },
    ],
    temperature,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned no content");
  }

  const json = JSON.parse(content);
  return schema.parse(json);
}
