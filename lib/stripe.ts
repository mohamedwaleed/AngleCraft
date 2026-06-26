import Stripe from "stripe";

export function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  return new Stripe(secretKey, { typescript: true });
}

export interface CreateCheckoutSessionOptions {
  sessionId: string;
  sessionToken: string;
  origin: string;
}

export interface CheckoutSessionResult {
  id: string;
  url: string;
}

export async function createCheckoutSession({
  sessionId,
  sessionToken,
  origin,
}: CreateCheckoutSessionOptions): Promise<CheckoutSessionResult> {
  const successUrl = `${origin}/checkout?success=true&session_token=${encodeURIComponent(sessionToken)}`;
  const cancelUrl = `${origin}/checkout?canceled=true&session_token=${encodeURIComponent(sessionToken)}`;

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "AngleCraft Full Campaign",
            description: "3 AI-generated ad creatives + testing plan",
          },
          unit_amount: 900,
        },
        quantity: 1,
      },
    ],
    metadata: {
      anglecraft_session_id: sessionId,
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  if (!session.url) {
    throw new Error("Stripe Checkout Session did not return a URL");
  }

  return { id: session.id, url: session.url };
}
