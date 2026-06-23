import OpenAI from "openai";

function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  return new OpenAI({ apiKey });
}

export const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

export async function generateChatCompletion(
  messages: OpenAI.Chat.ChatCompletionMessageParam[]
) {
  const response = await getOpenAI().chat.completions.create({
    model: DEFAULT_MODEL,
    messages,
  });

  return response.choices[0]?.message?.content ?? "";
}
