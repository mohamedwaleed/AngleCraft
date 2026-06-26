"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";

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
      className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg shadow-indigo-500/20"
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Sparkles className="mr-2 h-4 w-4" />
      )}
      Unlock Full Campaign — $9
    </Button>
  );
}
