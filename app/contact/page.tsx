import type { Metadata } from "next";
import Link from "next/link";
import { Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Contact — AngleCraft",
  description: "Get in touch with the AngleCraft team.",
};

const H: React.CSSProperties = { fontFamily: "var(--font-space-grotesk), sans-serif" };

export default function ContactPage() {
  return (
    <div className="min-h-full flex flex-col bg-[#F8FAFC]">
      <header className="sticky top-0 z-50 border-b border-[#E2E8F0] bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 flex h-16 items-center justify-between">
          <Link href="/" className="text-[17px] font-bold tracking-tight" style={H}>
            Angle<span className="text-indigo-500">Craft</span>
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link href="/" className="gap-2">
              <ArrowLeft className="size-4" />
              Back home
            </Link>
          </Button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-5 sm:p-6">
        <div className="w-full max-w-xl rounded-2xl border border-[#E2E8F0] bg-white p-8 sm:p-10 shadow-sm text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-indigo-50 mx-auto mb-6">
            <Mail className="size-7 text-indigo-500" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A] mb-3" style={H}>
            Contact us
          </h1>
          <p className="text-[#64748B] mb-8">
            Have a question, feedback, or need help with your campaign? We&apos;d love to hear from you.
          </p>
          <a
            href="mailto:info@m-waleed.com"
            className="inline-flex items-center gap-2 text-lg font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            <Mail className="size-5" />
            info@m-waleed.com
          </a>
        </div>
      </main>

      <footer className="border-t border-[#E2E8F0] py-8 sm:py-10 bg-white">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 text-center">
          <p className="text-xs text-[#94A3B8]">&copy; 2026 AngleCraft</p>
        </div>
      </footer>
    </div>
  );
}
