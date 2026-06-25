"use client";

import {
  Users,
  Target,
  AlertTriangle,
  Sparkles,
  HelpCircle,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BuyerInsightsData {
  buyerProfile: string;
  mainDesire: string;
  painPoints: string[];
  buyingTriggers: string[];
  objections: string[];
}

interface InsightCardProps {
  icon: React.ElementType;
  label: string;
  description: string;
  accent: { bg: string; icon: string; border: string };
  children: React.ReactNode;
  className?: string;
}

function InsightCard({ icon: Icon, label, description, accent, children, className }: InsightCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-white p-5 shadow-sm transition-all hover:shadow-md",
        accent.border,
        className
      )}
    >
      <div className="flex items-start gap-3 mb-4">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            accent.bg
          )}
        >
          <Icon className={cn("size-5", accent.icon)} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-[#0F172A]">{label}</h3>
          <p className="text-xs text-[#64748B]">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function ListItems({ items, bulletClass }: { items: string[]; bulletClass: string }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-[#334155] leading-relaxed">
          <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", bulletClass)} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function BuyerInsights({ data }: { data: BuyerInsightsData }) {
  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-xl p-6 sm:p-8">
      {/* Section header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex size-7 items-center justify-center rounded-lg bg-indigo-100">
              <Lightbulb className="size-4 text-indigo-600" />
            </div>
            <h2
              className="text-xl sm:text-2xl font-bold text-[#0F172A]"
              style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
            >
              Buyer Insights
            </h2>
          </div>
          <p className="text-sm text-[#64748B]">
            What the AI learned about your target buyer and why they buy.
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 self-start sm:self-auto">
          <Sparkles className="size-3.5" />
          AI-generated
        </div>
      </div>

      {/* Cards grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <InsightCard
          icon={Users}
          label="Buyer Profile"
          description="Who the ideal customer is"
          accent={{ bg: "bg-indigo-100", icon: "text-indigo-600", border: "border-indigo-100" }}
        >
          <p className="text-sm text-[#334155] leading-relaxed">{data.buyerProfile}</p>
        </InsightCard>

        <InsightCard
          icon={Target}
          label="Main Desire"
          description="The core outcome they want"
          accent={{ bg: "bg-violet-100", icon: "text-violet-600", border: "border-violet-100" }}
        >
          <p className="text-sm text-[#334155] leading-relaxed">{data.mainDesire}</p>
        </InsightCard>

        <InsightCard
          icon={AlertTriangle}
          label="Pain Points"
          description="Frustrations your product solves"
          accent={{ bg: "bg-rose-100", icon: "text-rose-600", border: "border-rose-100" }}
        >
          <ListItems items={data.painPoints} bulletClass="bg-rose-400" />
        </InsightCard>

        <InsightCard
          icon={Sparkles}
          label="Buying Triggers"
          description="What makes them act now"
          accent={{ bg: "bg-emerald-100", icon: "text-emerald-600", border: "border-emerald-100" }}
        >
          <ListItems items={data.buyingTriggers} bulletClass="bg-emerald-400" />
        </InsightCard>

        <InsightCard
          icon={HelpCircle}
          label="Objections to Handle"
          description="Doubts to address in your ads"
          accent={{ bg: "bg-amber-100", icon: "text-amber-600", border: "border-amber-100" }}
          className="sm:col-span-2 lg:col-span-1"
        >
          <ListItems items={data.objections} bulletClass="bg-amber-400" />
        </InsightCard>
      </div>
    </div>
  );
}
