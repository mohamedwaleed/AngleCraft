"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Crown } from "lucide-react";

export function CheckoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", { method: "POST" });
      if (!res.ok) {
        if (res.status === 409) {
          router.push("/results");
          return;
        }
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? "Checkout failed");
      }
      const { checkoutUrl } = (await res.json()) as { checkoutUrl: string };
      window.location.href = checkoutUrl;
    } catch (err) {
      console.error("Checkout error:", err);
      alert(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={loading}
      size="lg"
      className="relative overflow-hidden rounded-full h-14 px-8 text-base font-semibold tracking-tight bg-gradient-to-r from-indigo-700 via-violet-600 to-indigo-700 hover:from-indigo-600 hover:via-violet-500 hover:to-indigo-600 text-white shadow-2xl shadow-violet-500/30 transition-all duration-200 hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-violet-500/45 disabled:opacity-80"
    >
      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 ease-in-out hover:translate-x-full" />
      {loading ? (
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
      ) : (
        <Crown className="mr-2 h-5 w-5" />
      )}
      Generate Full Campaign — $4.99
    </Button>
  );
}
