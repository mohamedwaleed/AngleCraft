import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionFromCookie } from "@/lib/session";
import type { ImageStatus } from "@/lib/types";

// Lightweight status poll endpoint used by the status pipeline client
// component. Returns the current session status so the UI can advance steps
// without re-rendering the whole page server-side.
// Also includes creative image statuses for the post-payment pipeline.

export async function GET() {
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json(
      { error: "Session not found or expired" },
      { status: 404 }
    );
  }

  const response: {
    status: string;
    sessionId: string;
    imageStatuses?: ImageStatus[];
  } = { status: session.status, sessionId: session.id };

  // Include creative image statuses when session is in post-payment state.
  if (
    session.status === "paid" ||
    session.status === "generating" ||
    session.status === "complete"
  ) {
    const supabase = await createClient();
    const { data: creatives } = await supabase
      .from("ad_creatives")
      .select("image_status")
      .eq("session_id", session.id);

    if (creatives && creatives.length > 0) {
      response.imageStatuses = (creatives as { image_status: ImageStatus }[]).map(
        (c) => c.image_status
      );
    }
  }

  return NextResponse.json(response);
}
