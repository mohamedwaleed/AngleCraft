"use client";

import {
  Users,
  Target,
  AlertTriangle,
  Sparkles,
  HelpCircle,
} from "lucide-react";

interface BuyerInsightsData {
  buyerProfile: string;
  mainDesire: string;
  painPoints: string[];
  buyingTriggers: string[];
  objections: string[];
}

function InsightCard({
  icon: Icon,
  label,
  accent,
  children,
}: {
  icon: React.ElementType;
  label: string;
  accent: { bg: string; fg: string };
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div
          className="flex size-7 items-center justify-center rounded-lg"
          style={{ background: accent.bg, color: accent.fg }}
        >
          <Icon className="size-4" />
        </div>
        <h3 className="text-xs font-bold uppercase tracking-wide text-[#0F172A]">
          {label}
        </h3>
      </div>
      {children}
    </div>
  );
}

function ListItems({ items, bulletClass }: { items: string[]; bulletClass: string }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-[#334155] leading-relaxed">
          <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${bulletClass}`} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function BuyerInsights({ data }: { data: BuyerInsightsData }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <InsightCard
          icon={Users}
          label="Buyer Profile"
          accent={{ bg: "rgba(99,102,241,0.10)", fg: "#6366F1" }}
        >
          <p className="text-sm text-[#334155] leading-relaxed">{data.buyerProfile}</p>
        </InsightCard>

        <InsightCard
          icon={Target}
          label="Main Desire"
          accent={{ bg: "rgba(168,85,247,0.10)", fg: "#A855F7" }}
        >
          <p className="text-sm text-[#334155] leading-relaxed">{data.mainDesire}</p>
        </InsightCard>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <InsightCard
          icon={AlertTriangle}
          label="Pain Points"
          accent={{ bg: "rgba(239,68,68,0.10)", fg: "#EF4444" }}
        >
          <ListItems items={data.painPoints} bulletClass="bg-red-400" />
        </InsightCard>

        <InsightCard
          icon={Sparkles}
          label="Buying Triggers"
          accent={{ bg: "rgba(16,185,129,0.10)", fg: "#10B981" }}
        >
          <ListItems items={data.buyingTriggers} bulletClass="bg-emerald-400" />
        </InsightCard>
      </div>

      <InsightCard
        icon={HelpCircle}
        label="Objections to Handle"
        accent={{ bg: "rgba(245,158,11,0.10)", fg: "#F59E0B" }}
      >
        <ListItems items={data.objections} bulletClass="bg-amber-400" />
      </InsightCard>
    </div>
  );
}
