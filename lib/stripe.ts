import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

let cachedVaultSecret: string | null | undefined;

async function getStripeSecret(): Promise<string> {
  const envSecret = process.env.STRIPE_SECRET_KEY;
  if (envSecret) {
    return envSecret;
  }

  if (cachedVaultSecret === undefined) {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_secret_by_name", {
      secret_name: "STRIPE_SECRET_KEY",
    });

    if (error) {
      console.error("Failed to read STRIPE_SECRET_KEY from Supabase Vault:", error);
      throw new Error("STRIPE_SECRET_KEY is not set in environment or Supabase Vault");
    }

    cachedVaultSecret = data ?? null;
  }

  if (!cachedVaultSecret) {
    throw new Error("STRIPE_SECRET_KEY is not set in environment or Supabase Vault");
  }

  return cachedVaultSecret;
}

export async function getStripe(): Promise<Stripe> {
  const secretKey = await getStripeSecret();
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

  const stripe = await getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "AngleCraft Full Campaign",
            description: "3 AI-generated ad creatives + testing plan",
          },
          unit_amount: 499,
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
