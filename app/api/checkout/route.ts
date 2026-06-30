import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionFromCookie } from "@/lib/session";
import { createCheckoutSession } from "@/lib/stripe";
import type { CheckoutResponse } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json(
        { error: "Session not found or expired" },
        { status: 404 }
      );
    }

    if (session.status !== "angles_generated") {
      return NextResponse.json(
        { error: "Invalid session state" },
        { status: 409 }
      );
    }

    const supabase = await createClient();

    const { data: existingPayment } = await supabase
      .from("payments")
      .select("status")
      .eq("session_id", session.id)
      .eq("status", "succeeded")
      .maybeSingle();

    if (existingPayment) {
      return NextResponse.json(
        { error: "Payment already completed for this session" },
        { status: 409 }
      );
    }

    const origin =
      request.headers.get("origin") ??
      request.headers.get("host") ??
      "http://localhost:3000";
    const normalizedOrigin = origin.startsWith("http")
      ? origin
      : `https://${origin}`;

    const { id, url } = await createCheckoutSession({
      sessionId: session.id,
      sessionToken: session.token,
      origin: normalizedOrigin,
    });

    const { error: insertError } = await supabase.from("payments").insert({
      session_id: session.id,
      stripe_session_id: id,
      status: "pending",
      amount: 499,
      currency: "usd",
    });

    if (insertError) {
      console.error("checkout: insert payment failed:", insertError.message);
      return NextResponse.json(
        { error: "Failed to record payment attempt" },
        { status: 500 }
      );
    }

    const response: CheckoutResponse = { checkoutUrl: url };
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Checkout error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create checkout session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
