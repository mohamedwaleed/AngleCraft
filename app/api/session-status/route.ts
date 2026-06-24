import { NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/session";

// Lightweight status poll endpoint used by the status pipeline client
// component. Returns the current session status so the UI can advance steps
// without re-rendering the whole page server-side.

export async function GET() {
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json(
      { error: "Session not found or expired" },
      { status: 404 }
    );
  }

  return NextResponse.json({ status: session.status, sessionId: session.id });
}
