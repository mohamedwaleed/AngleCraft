// Payment verification helper.
// Used by post-payment route handlers to verify a session has been paid for.
// Handles the race condition where the Stripe webhook has updated the
// `payments` table but not yet updated the `sessions.status` to `paid`.

import { createClient } from "@/lib/supabase/server";
import { updateSessionStatus } from "@/lib/session";
import type { Session, SessionStatus } from "@/lib/types";

/**
 * Verify that a session has been paid for. Checks the session status first,
 * and falls back to the `payments` table if the session status hasn't been
 * updated yet (webhook race condition). If a succeeded payment is found but
 * the session status is stale, reconciles it to `paid`.
 *
 * Returns true if the session is paid, false otherwise.
 */
export async function verifyPaidSession(
  session: Session
): Promise<boolean> {
  if (
    session.status === "paid" ||
    session.status === "generating" ||
    session.status === "complete"
  ) {
    return true;
  }

  // Fall back to checking the payments table (webhook may have updated
  // payments but not sessions yet).
  const supabase = await createClient();
  const { data: payment } = await supabase
    .from("payments")
    .select("status")
    .eq("session_id", session.id)
    .maybeSingle();

  if (payment?.status === "succeeded") {
    // Reconcile: update session status to paid so future checks pass.
    try {
      await updateSessionStatus(session.id, "paid" as SessionStatus);
    } catch (err) {
      console.error("verifyPaidSession: reconcile failed:", err);
    }
    return true;
  }

  return false;
}
