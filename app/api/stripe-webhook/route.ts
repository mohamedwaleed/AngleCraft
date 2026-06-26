export const runtime = "nodejs";

import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature") ?? "";

  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    console.error("Stripe webhook signature verification failed:", message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const checkoutSession = event.data.object as Stripe.Checkout.Session;
    const sessionId = checkoutSession.metadata?.anglecraft_session_id;

    if (!sessionId) {
      console.error(
        "checkout.session.completed missing anglecraft_session_id metadata"
      );
      return NextResponse.json(
        { error: "Missing session metadata" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { error: paymentError } = await supabase
      .from("payments")
      .update({
        status: "succeeded",
        completed_at: new Date().toISOString(),
      })
      .eq("stripe_session_id", checkoutSession.id);

    if (paymentError) {
      console.error("stripe-webhook: update payment failed:", paymentError);
      return NextResponse.json(
        { error: "Failed to update payment" },
        { status: 500 }
      );
    }

    const { error: sessionError } = await supabase
      .from("sessions")
      .update({ status: "paid" })
      .eq("id", sessionId);

    if (sessionError) {
      console.error("stripe-webhook: update session failed:", sessionError);
      return NextResponse.json(
        { error: "Failed to update session status" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ received: true });
}
