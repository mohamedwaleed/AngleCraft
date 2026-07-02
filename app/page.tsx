"use client";

import { Button } from "@/components/ui/button";
import { ProductInput } from "@/components/product-input";
import {
  ArrowRight,
  Upload,
  Zap,
  Target,
  Lock,
  CheckCircle,
  Sparkles,
  TrendingUp,
  DollarSign,
  Clock,
  ImageIcon,
  Download,
  ShoppingCart,
  Lightbulb,
  Megaphone,
  LineChart,
  ShoppingBag,
  Music,
  Camera,
  Film,
  Globe,
} from "lucide-react";
import { useState, useEffect } from "react";

/* ─────────────────────────────────────────────────────────────────────
   Font helpers
───────────────────────────────────────────────────────────────────── */
const H: React.CSSProperties = { fontFamily: "var(--font-space-grotesk), sans-serif" };
const B: React.CSSProperties = { fontFamily: "var(--font-inter), sans-serif" };

/* ─────────────────────────────────────────────────────────────────────
   Shared micro-components
───────────────────────────────────────────────────────────────────── */

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-500 mb-3">
      {children}
    </p>
  );
}

function Divider() {
  return <div className="w-full border-t border-[#E2E8F0]" />;
}

function FreeBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-600">
      Free
    </span>
  );
}

function PaidBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-600">
      <Lock className="size-2.5" /> Paid
    </span>
  );
}

/* ── Hero showcase: rotating real generated campaigns ── */
const SHOWCASE_SLIDES = [
  {
    category: "Beauty & Lifestyle",
    angle: "Aspiration",
    headline: "Turn products into scroll-stopping lifestyle ads.",
    subtext: "Generated from customer psychology and buying intent.",
    image: "/hero-rhode.png",
    accent: "#A855F7",
  },
  {
    category: "Home Automation",
    angle: "Pain Point",
    headline: "Transform product benefits into buying triggers.",
    subtext: "Generated from real customer pain points.",
    image: "/hero-roborock.png",
    accent: "#6366F1",
  },
  {
    category: "Kids & Family",
    angle: "Emotional",
    headline: "Create emotional ads parents actually click.",
    subtext: "Built for Meta testing campaigns.",
    image: "/hero-yoto.png",
    accent: "#EC4899",
  },
];

function HeroShowcase() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % SHOWCASE_SLIDES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const slide = SHOWCASE_SLIDES[index];

  return (
    <div className="relative w-full max-w-sm mx-auto lg:max-w-none">
      <div className="relative rounded-2xl border border-[#E2E8F0] bg-white shadow-2xl shadow-indigo-900/5 overflow-hidden">
        {/* Real output label */}
        <div className="px-4 pt-2 pb-1 bg-white flex items-center justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-indigo-600">
            <Sparkles className="size-3" />
            Generated Campaign Preview
          </span>
        </div>

        {/* Image stage */}
        <div className="relative aspect-[6/5] overflow-hidden bg-[#F8FAFC]">
          {SHOWCASE_SLIDES.map((s, i) => (
            <div
              key={s.category}
              className="absolute inset-0 transition-all duration-700 ease-out"
              style={{
                opacity: i === index ? 1 : 0,
                transform: i === index ? "translateY(0) scale(1)" : "translateY(10px) scale(0.98)",
                zIndex: i === index ? 1 : 0,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.image}
                alt={s.headline}
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
          ))}

          {/* Category badge */}
          <div key={`badge-${index}`} className="absolute top-4 left-4 z-10 animate-in fade-in slide-in-from-top-2 duration-500">
            <span className="inline-flex items-center rounded-md bg-white/95 backdrop-blur-sm px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#475569] border border-white/50 shadow-sm">
              {slide.category}
            </span>
          </div>

          {/* Angle badge */}
          <div key={`angle-${index}`} className="absolute top-4 right-4 z-10 animate-in fade-in slide-in-from-top-2 duration-500">
            <span
              className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold text-white border border-white/25 shadow-sm"
              style={{ background: `${slide.accent}E6` }}
            >
              {slide.angle}
            </span>
          </div>

          {/* Dots */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 z-10">
            {SHOWCASE_SLIDES.map((s, i) => (
              <button
                key={s.category}
                onClick={() => setIndex(i)}
                className={`size-2 rounded-full transition-all duration-300 ${i === index ? "bg-white scale-110" : "bg-white/50 hover:bg-white/80"}`}
                aria-label={`Show ${s.category} slide`}
              />
            ))}
          </div>
        </div>

        {/* Copy block */}
        <div key={`copy-${index}`} className="px-4 sm:px-5 py-3 bg-white animate-in fade-in slide-in-from-bottom-2 duration-500">
          <p className="text-base sm:text-lg font-bold text-[#0F172A] leading-snug mb-1">
            {slide.headline}
          </p>
          <p className="text-xs sm:text-sm text-[#64748B] leading-snug">
            {slide.subtext}
          </p>
        </div>

        {/* Value stack */}
        <div className="px-4 sm:px-5 py-2 bg-white border-t border-[#F1F5F9]">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-medium text-[#0F172A]">
              <CheckCircle className="size-3.5 text-emerald-500" /> 5 Ad Angles
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-medium text-[#0F172A]">
              <CheckCircle className="size-3.5 text-emerald-500" /> Buyer Insights
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-medium text-[#0F172A]">
              <CheckCircle className="size-3.5 text-emerald-500" /> 3 Ready-to-Test Creatives
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-medium text-[#0F172A]">
              <CheckCircle className="size-3.5 text-emerald-500" /> Testing Playbook
            </span>
          </div>
        </div>

        {/* Explanation */}
        <div className="px-4 sm:px-5 py-2 bg-[#F8FAFC] border-t border-[#F1F5F9]">
          <p className="text-[11px] sm:text-xs text-[#64748B] leading-relaxed">
            Built from buyer psychology and designed for testing.
          </p>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-4 sm:px-5 py-2 bg-[#F8FAFC] border-t border-[#F1F5F9]">
          <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-semibold text-[#0F172A]">
            <CheckCircle className="size-3.5 text-emerald-500" /> Generated by AngleCraft
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-semibold text-[#0F172A]">
            <CheckCircle className="size-3.5 text-emerald-500" /> Ready for Meta Ads testing
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Section cards ── */
function AngleCard({ label, hook }: { label: string; hook: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-px">
      <span className="inline-flex w-fit items-center rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-600 tracking-wide">
        {label}
      </span>
      <p className="text-sm font-medium text-[#0F172A] leading-snug">&ldquo;{hook}&rdquo;</p>
    </div>
  );
}

function HookCard({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-px">
      <p className="text-sm font-medium text-[#0F172A]">&ldquo;{text}&rdquo;</p>
    </div>
  );
}

/* ── Example ad card (example creatives section) ── */
function ExampleAdCard({
  style,
  angle,
  headline,
  body,
  cta,
  gradient,
  photoSrc,
  accentColor = "#6366F1",
  ugc = false,
}: {
  style: string;
  angle: string;
  headline: string;
  body: string;
  cta: string;
  gradient: string;
  /** If provided, renders a real photo ad (hero creative style) */
  photoSrc?: string;
  accentColor?: string;
  /** If true, renders with a raw UGC feel — imperfect, casual, phone-like */
  ugc?: boolean;
}) {
  /* ── UGC-style photo ad: raw, slightly imperfect, phone-like ── */
  if (photoSrc && ugc) {
    return (
      <div className="group relative rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5 bg-white flex flex-col [transform:rotate(0deg)] sm:[transform:rotate(-1.2deg)]">
        {/* Image area — taller, phone-like */}
        <div className="relative h-52 sm:h-64 w-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoSrc}
            alt={headline}
            className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.04]"
          />
          {/* Dark gradient overlay — heavier at bottom for raw feel */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.30) 50%, rgba(0,0,0,0.05) 100%)",
            }}
          />
          {/* UGC sticker tag — top-left, slightly rotated, handwritten feel */}
          <span
            className="absolute top-3 left-3 inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold text-white shadow-md"
            style={{ background: accentColor, transform: "rotate(-3deg)" }}
          >
            {style}
          </span>
          {/* Angle tag — top-right, simple */}
          <span className="absolute top-3 right-3 rounded bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white/80">
            {angle}
          </span>
          {/* Casual lowercase headline — feels like a real social caption */}
          <div className="absolute inset-x-0 bottom-0 flex flex-col justify-end p-4 pt-10">
            <p className="text-base font-bold text-white leading-[1.2] drop-shadow-lg max-w-[95%] lowercase">
              {headline}
            </p>
          </div>
          {/* CTA — pill style, bottom-right */}
          <div className="absolute bottom-3 right-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-900 shadow-lg">
              {cta} <ArrowRight className="size-3" />
            </span>
          </div>
        </div>
        {/* Short caption below */}
        <div className="px-4 py-3 bg-white">
          <p className="text-sm text-[#64748B] leading-relaxed">{body}</p>
        </div>
      </div>
    );
  }

  /* ── Real photo ad: full image + dark gradient + big overlay text ── */
  if (photoSrc) {
    return (
      <div className="group relative rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5 bg-white flex flex-col">
        {/* Image area */}
        <div className="relative h-48 sm:h-56 w-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoSrc}
            alt={headline}
            className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.04]"
          />
          {/* Dark gradient overlay */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, rgba(2,6,23,0.90) 0%, rgba(2,6,23,0.45) 45%, rgba(2,6,23,0.10) 100%)",
            }}
          />
          {/* Style tag — top-left */}
          <span
            className="absolute top-3 left-3 inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold text-white border border-white/25 shadow-sm"
            style={{ background: `${accentColor}E6` }}
          >
            {style}
          </span>
          {/* Angle tag — top-right */}
          <span className="absolute top-3 right-3 rounded-full bg-slate-900/70 backdrop-blur-sm border border-white/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            {angle}
          </span>
          {/* Big bold headline overlay */}
          <div className="absolute inset-x-0 bottom-0 flex flex-col justify-end p-4 pt-10">
            <p className="text-lg font-black text-white leading-[1.1] drop-shadow-lg max-w-[90%]">
              {headline}
            </p>
          </div>
          {/* CTA button inside image */}
          <div className="absolute bottom-3 right-3">
            <span
              className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold text-white shadow-lg"
              style={{ background: accentColor }}
            >
              {cta} <ArrowRight className="size-3" />
            </span>
          </div>
        </div>
        {/* Short caption below */}
        <div className="px-4 py-3 bg-white">
          <p className="text-sm text-[#64748B] leading-relaxed">{body}</p>
        </div>
      </div>
    );
  }

  /* ── Default: gradient UI card ── */
  return (
    <div className="rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-md transition-all hover:shadow-xl hover:-translate-y-0.5 bg-white flex flex-col">
      {/* Ad visual */}
      <div className="h-40 flex flex-col justify-end p-5 relative" style={{ background: gradient }}>
        {/* Style tag */}
        <span className="absolute top-3 left-3 rounded-full bg-white/20 backdrop-blur-sm px-2.5 py-0.5 text-[10px] font-bold text-white border border-white/30">
          {style}
        </span>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-white/70 mb-1">{angle}</p>
        <p className="text-base font-extrabold text-white leading-tight drop-shadow-md">{headline}</p>
      </div>
      {/* Body + CTA */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        <p className="text-sm text-[#64748B] leading-relaxed">{body}</p>
        <div className="mt-auto">
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-sm">
            {cta} <ArrowRight className="size-3.5" />
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   Main page
───────────────────────────────────────────────────────────────────── */

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-white text-[#0F172A]" style={B}>

      {/* ══════════════════════════════════════════════════
          NAV
      ══════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 border-b border-[#E2E8F0] bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 flex h-16 items-center justify-between">
          <span className="text-[17px] font-bold tracking-tight" style={H}>
            Angle<span className="text-indigo-500">Craft</span>
          </span>
          <nav className="hidden sm:flex items-center gap-6 text-sm text-[#64748B]">
            <a href="#how" className="hover:text-[#0F172A] transition-colors">How it works</a>
            <a href="#preview" className="hover:text-[#0F172A] transition-colors">What you get</a>
            <a href="#pricing" className="hover:text-[#0F172A] transition-colors">Pricing</a>
            <a href="/contact" className="hover:text-[#0F172A] transition-colors">Contact</a>
          </nav>
          <Button
            size="sm"
            className="rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white px-3 sm:px-4 shadow-sm transition-colors"
            asChild
          >
            <a href="#generate">
              <span className="hidden sm:inline">Get My Free Ad Strategy</span>
              <span className="sm:hidden">Start Free</span>
            </a>
          </Button>
        </div>
      </header>

      <main className="flex-1">

        {/* ══════════════════════════════════════════════════
            HERO
        ══════════════════════════════════════════════════ */}
        <section
          className="relative overflow-hidden pt-10 sm:pt-16 lg:pt-20 pb-12 sm:pb-24"
          style={{ background: "linear-gradient(160deg, #fafafe 0%, #f5f3ff 40%, #eef2ff 100%)" }}
        >
          {/* Radial glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute"
            style={{
              top: "-10%", left: "50%", transform: "translateX(-50%)",
              width: "1100px", height: "700px",
              background: "radial-gradient(ellipse at 50% 30%, rgba(99,102,241,0.18) 0%, rgba(139,92,246,0.10) 35%, transparent 65%)",
              filter: "blur(2px)",
            }}
          />

          <div className="relative mx-auto max-w-6xl px-5 sm:px-6 grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">

            {/* ── Left ── */}
            <div className="flex flex-col items-start">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white px-3 sm:px-3.5 py-1.5 text-[11px] sm:text-xs font-semibold text-indigo-600 shadow-sm mb-5 sm:mb-7">
                <Sparkles className="size-3.5" />
                AI Creative Strategy for E-commerce Ads
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.12] sm:leading-[1.04] mb-5" style={H}>
                Stop Guessing Which{" "}
                <span
                  className="text-transparent bg-clip-text"
                  style={{ backgroundImage: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 55%, #A855F7 100%)" }}
                >
                  Ads To Create
                </span>
              </h1>

              <p className="text-sm sm:text-lg text-[#64748B] leading-relaxed mb-3 max-w-lg">
                Generate your product&apos;s ad angles, hooks, and ready-to-test creatives before spending money on ads.
              </p>
              <p className="text-xs sm:text-sm text-indigo-500 font-medium mb-6 max-w-lg">
                Plan your next ad testing sprint — instantly.
              </p>

              {/* CTA */}
              <div className="mb-5 flex flex-col items-center">
                <Button
                  size="lg"
                  className="gap-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white px-6 sm:px-8 py-3.5 sm:py-4 h-auto text-sm sm:text-base font-semibold shadow-lg shadow-indigo-200 transition-all hover:shadow-xl hover:shadow-indigo-300 hover:-translate-y-0.5 active:translate-y-0 w-full sm:w-auto"
                  asChild
                >
                  <a href="#generate">
                    Get My Free Ad Strategy
                    <ArrowRight className="size-4" />
                  </a>
                </Button>
                <p className="mt-2.5 text-xs text-[#94A3B8]">No credit card required</p>
              </div>

              {/* Trust bullets */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2.5">
                  <CheckCircle className="size-4 text-emerald-500 shrink-0" />
                  <span className="text-sm text-[#64748B]">Product-specific</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle className="size-4 text-emerald-500 shrink-0" />
                  <span className="text-sm text-[#64748B]">Generated from buyer psychology</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle className="size-4 text-emerald-500 shrink-0" />
                  <span className="text-sm text-[#64748B]">Ready to test on Meta Ads</span>
                </div>
              </div>


            </div>

            {/* ── Right: rotating generated campaign showcase ── */}
            <div className="relative mt-6 lg:mt-0">
              <HeroShowcase />
            </div>
          </div>

          {/* Differentiation line */}
          <div className="relative mx-auto max-w-2xl px-5 sm:px-6 mt-6 sm:mt-8 text-center">
            <p className="text-sm sm:text-lg font-semibold text-[#0F172A] leading-relaxed">
              Most AI tools create images.{" "}
              <span className="text-indigo-500">AngleCraft tells you what ads to create — then generates them.</span>
            </p>
          </div>

          {/* Built for */}
          <div className="relative mx-auto max-w-xl px-5 sm:px-6 mt-8 sm:mt-10 text-center">
            <p className="text-sm font-semibold text-[#64748B] mb-4">
              Built for
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {[
                "Shopify stores",
                "Dropshippers",
                "E-commerce marketers",
              ].map((item) => (
                <span key={item} className="inline-flex items-center gap-1.5 rounded-full border border-[#E2E8F0] bg-white px-3 py-1.5 text-sm font-medium text-[#475569] shadow-sm">
                  <CheckCircle className="size-3.5 text-emerald-500" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        <Divider />

        {/* ══════════════════════════════════════════════════
            HOW IT WORKS — white
        ══════════════════════════════════════════════════ */}
        <section id="how" className="py-16 sm:py-32 bg-white">
          <div className="mx-auto max-w-5xl px-5 sm:px-6">
            <div className="text-center mb-10 sm:mb-16">
              <Eyebrow>How It Works</Eyebrow>
              <h2 className="text-2xl sm:text-4xl font-bold text-[#0F172A]" style={H}>
                Three steps to test-ready ads
              </h2>
            </div>

            <div className="grid sm:grid-cols-3 gap-4 sm:gap-5">
              {/* Step 1 */}
              <div className="relative flex flex-col gap-3 sm:gap-4 rounded-2xl border border-[#E2E8F0] bg-white p-5 sm:p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-px">
                <span className="absolute top-4 right-5 text-5xl font-black select-none leading-none text-indigo-500/[0.06]">1</span>
                <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50">
                  <Upload className="size-5 text-indigo-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#0F172A] mb-1" style={H}>Upload your product</h3>
                  <p className="text-sm text-[#64748B] leading-relaxed">Paste a URL or upload your product image</p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="relative flex flex-col gap-3 sm:gap-4 rounded-2xl border border-[#E2E8F0] bg-white p-5 sm:p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-px">
                <span className="absolute top-4 right-5 text-5xl font-black select-none leading-none text-indigo-500/[0.06]">2</span>
                <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50">
                  <Zap className="size-5 text-indigo-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#0F172A] mb-1" style={H}>AI finds your best angles</h3>
                  <p className="text-sm text-[#64748B] leading-relaxed">Get angles, hooks, and buyer insights instantly</p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="relative flex flex-col gap-3 sm:gap-4 rounded-2xl border border-[#E2E8F0] bg-white p-5 sm:p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-px">
                <span className="absolute top-4 right-5 text-5xl font-black select-none leading-none text-indigo-500/[0.06]">3</span>
                <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50">
                  <ImageIcon className="size-5 text-indigo-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#0F172A] mb-1" style={H}>Generate ads ready for testing</h3>
                  <p className="text-sm text-[#64748B] leading-relaxed">Get ad images, copy, and a testing plan — ready to launch</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <Divider />

        {/* ══════════════════════════════════════════════════
            GENERATE FORM — light indigo bg
        ══════════════════════════════════════════════════ */}
        <section
          id="generate"
          className="py-16 sm:py-32"
          style={{ background: "linear-gradient(160deg, #f5f3ff 0%, #eef2ff 100%)" }}
        >
          <div className="mx-auto max-w-lg px-5 sm:px-6">
            <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-xl p-6 sm:p-10">
              <div className="text-center mb-6 sm:mb-8">
                <Eyebrow>Free Preview</Eyebrow>
                <h2 className="text-xl sm:text-3xl font-bold text-[#0F172A] mb-2" style={H}>
                  Start Your Free Strategy Preview
                </h2>
                <p className="text-[#64748B]">
                  Paste your product URL to generate free ad angles and hooks.
                </p>
                <p className="mt-2 text-xs text-[#94A3B8]">No signup required &bull; Takes 30 seconds</p>
              </div>

              <ProductInput />
            </div>
          </div>
        </section>

        <Divider />

        {/* ══════════════════════════════════════════════════
            WHAT YOU'LL GET — split free / paid — white
        ══════════════════════════════════════════════════ */}
        <section id="preview" className="py-16 sm:py-32 bg-white">
          <div className="mx-auto max-w-5xl px-5 sm:px-6">
            <div className="text-center mb-4">
              <Eyebrow>What You&apos;ll Get</Eyebrow>
              <h2 className="text-2xl sm:text-4xl font-bold text-[#0F172A]" style={H}>
                Get Ad Angles for Free.{" "}
                <span className="text-indigo-500">Unlock Creatives When Ready.</span>
              </h2>
              <p className="mt-3 text-sm sm:text-base text-[#64748B] max-w-md mx-auto">
                Start with angles and hooks at no cost. Upgrade to get ready-to-use ad creatives.
              </p>
            </div>

            <div className="mt-10 sm:mt-14 grid md:grid-cols-2 gap-4 sm:gap-6">

              {/* FREE column */}
              <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/40 p-5 sm:p-6 flex flex-col gap-4">
                <div className="flex items-center gap-3 mb-1">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-white border border-emerald-200 shadow-sm">
                    <CheckCircle className="size-5 text-emerald-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-[#0F172A]" style={H}>Strategy Preview</h3>
                      <FreeBadge />
                    </div>
                    <p className="text-xs text-[#64748B]">Instant, no signup</p>
                  </div>
                </div>
                <ul className="flex flex-col gap-3">
                  {[
                    "5 Ad Angles",
                    "5 Hooks",
                    "Buyer Insights",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2.5 text-sm text-[#0F172A]">
                      <CheckCircle className="size-4 text-emerald-500 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* PAID column */}
              <div className="relative rounded-2xl border-2 border-indigo-300 bg-indigo-50/30 p-5 sm:p-6 flex flex-col gap-4 overflow-hidden shadow-md">
                {/* Top header */}
                <div className="flex items-center gap-3 mb-1">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-white border border-indigo-200 shadow-sm">
                    <Lock className="size-5 text-indigo-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-[#0F172A]" style={H}>Complete Ad Campaign</h3>
                      <PaidBadge />
                    </div>
                    <p className="text-xs text-[#64748B]">Unlock after free preview</p>
                  </div>
                </div>
                <ul className="flex flex-col gap-3">
                  <li className="flex flex-col gap-0.5 text-sm font-medium text-[#0F172A]">
                    <span className="flex items-center gap-2.5">
                      <CheckCircle className="size-4 text-indigo-500 shrink-0" />
                      3 Ready-to-run Ad Creatives
                    </span>
                    <span className="text-xs text-[#94A3B8] pl-6">Image + Copy + CTA</span>
                  </li>
                  {[
                    "Ready-to-use ad copy",
                    "3 creative concepts",
                    "Testing roadmap",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2.5 text-sm font-medium text-[#0F172A]">
                      <CheckCircle className="size-4 text-indigo-500 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <div className="mt-auto pt-2">
                  <Button
                    size="sm"
                    className="gap-1.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white px-5 shadow-sm w-full"
                    asChild
                  >
                    <a href="#generate">
                      Get My Free Ad Strategy <ArrowRight className="size-3.5" />
                    </a>
                  </Button>
                  <p className="mt-2 text-[10px] text-[#94A3B8] text-center">Available after free preview</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <Divider />

        {/* ══════════════════════════════════════════════════
            STRATEGY — everything you need
        ══════════════════════════════════════════════════ */}
        <section className="py-16 sm:py-32 bg-white">
          <div className="mx-auto max-w-5xl px-5 sm:px-6">
            <div className="text-center mb-10 sm:mb-14">
              <Eyebrow>Strategy</Eyebrow>
              <h2 className="text-2xl sm:text-4xl font-bold text-[#0F172A] mb-4" style={H}>
                Everything You Need to Launch Test-Ready Ads
              </h2>
              <p className="text-sm sm:text-base text-[#64748B] max-w-xl mx-auto">
                We don&apos;t just generate ads — we help you decide what to test and why.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {[
                { icon: Target, title: "High-potential angles based on psychology", desc: "We find the emotional triggers that make buyers stop scrolling." },
                { icon: Sparkles, title: "High-converting hooks & copy", desc: "Primary text, headlines, and openers that drive action." },
                { icon: ImageIcon, title: "AI-generated ad creatives", desc: "Image and video concepts built around your best angles." },
                { icon: Download, title: "Ready-to-use ad pack", desc: "Download everything, formatted for Meta Ads." },
                { icon: LineChart, title: "Testing recommendations", desc: "Know which angles to test first and how to scale based on data." },
                { icon: Lightbulb, title: "Decision-making support", desc: "Get a clear strategy, not just a list of ideas." },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex flex-col gap-3 sm:gap-4 rounded-2xl border border-[#E2E8F0] bg-white p-5 sm:p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-px">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50">
                    <Icon className="size-5 text-indigo-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#0F172A] mb-1" style={H}>{title}</h3>
                    <p className="text-sm text-[#64748B] leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Strategy moment — what to test first */}
            <div className="mt-8 sm:mt-10 rounded-2xl border border-indigo-200 bg-indigo-50/50 p-5 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-indigo-500 shadow-md">
                <LineChart className="size-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-[#0F172A] mb-1" style={H}>Know what to test first</h3>
                <p className="text-sm sm:text-base text-[#64748B] leading-relaxed">
                  Start by testing all generated creatives together. Test for 3 days. Scale the strongest performer.
                  AngleCraft gives you a clear plan — not just a list of ideas.
                </p>
              </div>
            </div>

            <div className="mt-10 sm:mt-12 text-center">
              <Button
                size="lg"
                className="gap-2 h-12 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white px-6 sm:px-8 text-sm sm:text-base font-semibold shadow-md shadow-indigo-100 transition-all hover:shadow-lg hover:shadow-indigo-200 hover:-translate-y-0.5 active:translate-y-0 w-full sm:w-auto"
                asChild
              >
                <a href="#generate">Get My Free Ad Strategy <ArrowRight className="size-4" /></a>
              </Button>
              <p className="mt-3 text-xs text-[#94A3B8]">Available after free preview</p>
            </div>
          </div>
        </section>

        <Divider />

        {/* ══════════════════════════════════════════════════
            EXAMPLE AD CREATIVES — light indigo bg
        ══════════════════════════════════════════════════ */}
        <section
          className="py-16 sm:py-32"
          style={{ background: "linear-gradient(160deg, #f5f3ff 0%, #eef2ff 100%)" }}
        >
          <div className="mx-auto max-w-5xl px-5 sm:px-6">
            <div className="text-center mb-10 sm:mb-14">
              <Eyebrow>Example Creatives</Eyebrow>
              <h2 className="text-2xl sm:text-4xl font-bold text-[#0F172A] mb-3" style={H}>
                Real Ads Generated by AngleCraft
              </h2>
              <p className="text-sm sm:text-base text-[#64748B] max-w-lg mx-auto">
                Different angles, different audiences — all ready to test on Meta Ads.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              <ExampleAdCard
                style="UGC"
                angle="Convenience"
                headline="Blend anywhere, anytime"
                body="Take your smoothie routine wherever life takes you. No power outlet needed."
                cta="Shop Now"
                gradient="linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)"
                photoSrc="https://images.unsplash.com/photo-1775326726034-dd3d4cb0898a?w=600&q=80&auto=format&fit=crop"
                accentColor="#6366F1"
                ugc
              />
              <ExampleAdCard
                style="Product"
                angle="Time Saving"
                headline="Healthy in 30 seconds flat"
                body="Stop wasting mornings. One press, done. Get your nutrition without the effort."
                cta="Get Yours"
                gradient="linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)"
                photoSrc="https://images.unsplash.com/photo-1780511879742-a77cb3b23c20?w=600&q=80&auto=format&fit=crop"
                accentColor="#7C3AED"
              />
              <ExampleAdCard
                style="Lifestyle"
                angle="Cost Saving"
                headline="Save $200/mo on smoothie bars"
                body="Stop overpaying. Make café-quality drinks at home for cents per serving."
                cta="Save Now"
                gradient="linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)"
                photoSrc="https://images.unsplash.com/photo-1577594412764-f8fa57d4e5b4?w=600&q=80&auto=format&fit=crop"
                accentColor="#4F46E5"
              />
              <ExampleAdCard
                style="Hook"
                angle="Problem / Solution"
                headline="Why are you still blending the hard way?"
                body="Most blenders need an outlet. This one doesn&rsquo;t. Upgrade your morning."
                cta="Shop Now"
                gradient="linear-gradient(135deg, #8B5CF6 0%, #C084FC 100%)"
                photoSrc="https://images.unsplash.com/photo-1621878974675-91a5f1809ace?w=600&q=80&auto=format&fit=crop"
                accentColor="#8B5CF6"
              />
            </div>

            <div className="mt-8 sm:mt-10 text-center">
              <Button
                size="lg"
                className="gap-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white px-6 sm:px-8 py-3.5 sm:py-4 h-auto text-sm sm:text-base font-semibold shadow-lg shadow-indigo-200 transition-all hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 w-full sm:w-auto"
                asChild
              >
                <a href="#generate">
                  Get My Free Ad Strategy
                  <ArrowRight className="size-4" />
                </a>
              </Button>
            </div>
          </div>
        </section>

        <Divider />

        {/* ══════════════════════════════════════════════════
            STOP GUESSING — dark
        ══════════════════════════════════════════════════ */}
        <section className="py-16 sm:py-32 bg-[#0F172A] relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2"
            style={{
              width: "800px", height: "400px",
              background: "radial-gradient(ellipse at center, rgba(99,102,241,0.14) 0%, transparent 60%)",
            }}
          />
          <div className="relative mx-auto max-w-3xl px-5 sm:px-6 text-center">
            <h2 className="text-2xl sm:text-4xl font-bold text-white mb-4 sm:mb-5" style={H}>
              Stop Guessing What Works
            </h2>
            <p className="text-[#94A3B8] text-sm sm:text-lg leading-relaxed mb-8 sm:mb-12 max-w-xl mx-auto">
              Most ads fail because of bad angles — not bad products. AngleCraft finds
              the angles that convert, then builds the creatives for you.
            </p>
            <ul className="text-left max-w-sm mx-auto space-y-3 sm:space-y-4 mb-8 sm:mb-12">
              {[
                "Find proven angles in seconds — free",
                "Generate scroll-stopping hooks instantly",
                "Turn angles into real ad creatives",
                "Skip hours of brainstorming and guesswork",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 sm:gap-3.5">
                  <CheckCircle className="size-5 text-indigo-400 shrink-0" />
                  <span className="text-sm sm:text-base text-[#CBD1E1]">{item}</span>
                </li>
              ))}
            </ul>
            <Button
              size="lg"
              className="gap-2 h-12 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white px-6 sm:px-8 text-sm sm:text-base font-semibold shadow-lg shadow-indigo-900/40 transition-all hover:-translate-y-0.5 active:translate-y-0 w-full sm:w-auto"
              asChild
            >
              <a href="#generate">Get My Free Ad Strategy <ArrowRight className="size-4" /></a>
            </Button>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════
            UNLOCK AD CREATIVES — light indigo bg
        ══════════════════════════════════════════════════ */}
        <section
          id="pricing"
          className="py-16 sm:py-32"
          style={{ background: "linear-gradient(160deg, #f5f3ff 0%, #eef2ff 100%)" }}
        >
          <div className="mx-auto max-w-2xl px-5 sm:px-6 text-center">
            <Eyebrow>Full Ad Strategy Pack</Eyebrow>
            <h2 className="text-2xl sm:text-4xl font-bold text-[#0F172A] mb-4" style={H}>
              Unlock Your Ad Testing Sprint
            </h2>
            <p className="text-[#64748B] text-sm sm:text-base mb-8 sm:mb-10">
              Get your full testing plan, creatives, and recommendations — after your free preview.
            </p>

            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 sm:p-8 text-left mb-6 sm:mb-8 shadow-md">
              <ul className="space-y-3 sm:space-y-4">
                {[
                  { icon: ImageIcon, text: "3 ready-to-use ad creatives" },
                  { icon: Target, text: "Multiple angles to test" },
                  { icon: Zap, text: "Hooks & primary text included" },
                  { icon: ShoppingCart, text: "Formats for Meta Ads" },
                  { icon: CheckCircle, text: "Testing recommendations" },
                ].map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-center gap-3.5">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50">
                      <Icon className="size-4 text-indigo-500" />
                    </div>
                    <span className="text-sm sm:text-base text-[#0F172A]">{text}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Button
              size="lg"
              className="gap-2 h-12 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white px-6 sm:px-8 text-sm sm:text-base font-semibold shadow-md shadow-indigo-100 transition-all hover:shadow-lg hover:shadow-indigo-200 hover:-translate-y-0.5 active:translate-y-0 w-full sm:w-auto"
              asChild
            >
              <a href="#generate">Get My Free Ad Strategy <ArrowRight className="size-4" /></a>
            </Button>
            <p className="mt-3 text-xs text-[#94A3B8]">Available after free preview</p>
          </div>
        </section>

        <Divider />

        {/* ══════════════════════════════════════════════════
            FINAL CTA
        ══════════════════════════════════════════════════ */}
        <section
          className="py-16 sm:py-32"
          style={{ background: "linear-gradient(160deg, #fafafe 0%, #eef2ff 100%)" }}
        >
          <div className="mx-auto max-w-2xl px-5 sm:px-6 text-center">
            <h2 className="text-2xl sm:text-4xl font-bold text-[#0F172A] mb-4" style={H}>
              Ready to Find Your High-Potential Ads?
            </h2>
            <p className="text-[#64748B] mb-6 sm:mb-8 text-sm sm:text-lg">
              Paste your product and get free ad angles in seconds.
            </p>
            <Button
              size="lg"
              className="gap-2 h-12 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white px-6 sm:px-8 text-sm sm:text-base font-semibold shadow-md shadow-indigo-100 transition-all hover:shadow-lg hover:shadow-indigo-200 hover:-translate-y-0.5 active:translate-y-0 w-full sm:w-auto"
              asChild
            >
              <a href="#generate">Get My Free Ad Strategy <ArrowRight className="size-4" /></a>
            </Button>
            <p className="mt-4 text-xs text-[#94A3B8]">No signup &bull; Instant results &bull; Free to start</p>
          </div>
        </section>
      </main>

      {/* ══════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════ */}
      <footer className="border-t border-[#E2E8F0] py-8 sm:py-10 bg-white">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="font-bold text-[#0F172A]" style={H}>
              Angle<span className="text-indigo-500">Craft</span>
            </span>
            <p className="text-xs text-[#94A3B8] mt-0.5">AI-powered ad idea generator for e-commerce brands</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-[#94A3B8]">
            <a href="/contact" className="hover:text-[#0F172A] transition-colors">Contact</a>
            <span>&copy; 2026 AngleCraft</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
