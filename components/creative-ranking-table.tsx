"use client";

import type { CreativeStrategy } from "@/lib/types";

interface CreativeRankingTableProps {
  strategies: CreativeStrategy[];
}

export function CreativeRankingTable({ strategies }: CreativeRankingTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-[#E2E8F0]">
            <tr>
              <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">
                Creative
              </th>
              <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">
                Angle
              </th>
              <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">
                Psychology
              </th>
              <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">
                Use Case
              </th>
              <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-[#64748B] text-right">
                Testing Priority
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {strategies.map((s) => (
              <tr key={s.creativeIndex} className="hover:bg-slate-50/50">
                <td className="px-4 py-3 text-sm font-bold text-[#0F172A]">
                  Creative #{s.creativeIndex}
                </td>
                <td className="px-4 py-3 text-sm text-[#475569]">
                  {s.angleCategory}
                </td>
                <td className="px-4 py-3 text-sm text-[#475569] max-w-xs truncate" title={s.psychology}>
                  {s.psychology}
                </td>
                <td className="px-4 py-3 text-sm text-[#475569]">
                  {s.bestUseCase}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700">
                    #{s.testingPriority}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="px-4 py-3 text-[11px] text-[#64748B] border-t border-[#E2E8F0] bg-slate-50/50">
        Priority indicates recommended testing order, not predicted performance.
      </p>
    </div>
  );
}
