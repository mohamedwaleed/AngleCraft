import { generateChatCompletion } from "@/lib/openai";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { messages } = (await request.json()) as {
      messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Messages are required" }, { status: 400 });
    }

    const content = await generateChatCompletion(messages);

    return NextResponse.json({ content });
  } catch (error) {
    console.error("Chat completion error:", error);
    return NextResponse.json(
      { error: "Failed to generate chat completion" },
      { status: 500 }
    );
  }
}
