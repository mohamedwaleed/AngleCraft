"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Polls /api/session-status while a Stripe webhook is pending. When the
 * session status flips to `paid` (webhook confirmed), reloads the page so the
 * Server Component re-renders with the post-payment pipeline.
 */
export function PaymentPendingPoller() {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/session-status");
        if (!res.ok) return;
        const data = await res.json();
        const status = data?.status as string | undefined;
        if (status === "paid" || status === "generating" || status === "complete") {
          router.refresh();
        }
      } catch {
        // Ignore transient poll errors.
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [router]);

  return null;
}
