"use client";
import { useState } from "react";
import clsx from "clsx";
import { AlertTriangle, Lock, TrendingDown, Users } from "lucide-react";
import { DIMENSIONS, DIMENSION_META } from "@/lib/dimensions";
import type { GroupingKey, InclusionData, InclusionInsight } from "@/lib/types";

const KIND_ICON: Record<InclusionInsight["kind"], typeof AlertTriangle> = {
  gap: Users,
  decline: TrendingDown,
  risk: AlertTriangle,
};

/** Aggregate-only view of which groups feel excluded or carry more risk. No per-person data. */
export function InclusionInsights({ data, demo }: { data: InclusionData; demo?: boolean }) {
  const [tab, setTab] = useState<GroupingKey>("department");
  const grouping = data.groupings.find((g) => g.key === tab)!;
  const insights = data.insights;

  return (
    <div className="space-y-5">
      {demo && (
        <p className="border border-warning/60 bg-warning/10 px-3 py-2 text-sm text-ink-2">
          <strong className="font-medium text-ink">Demo data:</strong> gender and ethnicity here are randomly assigned
          to fictional interns, so any pattern below is noise, not a real finding about any group.
        </p>
      )}
      {/* Flagged patterns */}
      <div>
        <h3 className="mb-2 text-base font-medium text-heading">Flagged patterns</h3>
        {insights.length === 0 ? (
          <p className="text-sm text-muted">No group is scoring notably lower, declining, or carrying extra risk right now.</p>
        ) : (
          <ul className="grid gap-2 md:grid-cols-2">
            {insights.map((i, k) => {
              const Icon = KIND_ICON[i.kind];
              return (
                <li key={k} className="flex gap-3 border border-line border-l-4 border-l-critical bg-white p-3">
                  <Icon size={18} className="mt-0.5 shrink-0 text-critical" aria-hidden />
                  <div className="text-sm">
                    <div className="text-ink">
                      <span className="font-medium">{i.group}</span>{" "}
                      <span className="text-muted">
                        · {data.groupings.find((g) => g.key === i.grouping)?.label} · n={i.n}
                      </span>
                    </div>
                    <div className="text-ink-2">{i.text}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Group table */}
      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-medium text-heading">By group</h3>
          <div className="inline-flex border border-input-stroke font-ui text-sm" role="tablist">
            {data.groupings.map((g) => (
              <button
                key={g.key}
                role="tab"
                aria-selected={tab === g.key}
                onClick={() => setTab(g.key)}
                className={clsx(
                  "px-3 py-1.5 transition",
                  tab === g.key ? "bg-accent text-white" : "bg-white text-rbc-navy hover:bg-surface-2",
                )}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {grouping.groups.length === 0 ? (
          <p className="text-sm text-muted">
            No {grouping.label.toLowerCase()} group has {data.minGroupSize}+ people yet, so nothing is shown.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="py-2 pr-3 font-normal">{grouping.label}</th>
                  <th className="py-2 pr-3 text-right font-normal">n</th>
                  <th className="py-2 pr-3 text-right font-normal">At risk</th>
                  {DIMENSIONS.map((d) => (
                    <th key={d} className="py-2 pr-3 text-right font-normal">{DIMENSION_META[d].short}</th>
                  ))}
                  <th className="py-2 text-right font-normal">Named reports</th>
                </tr>
              </thead>
              <tbody>
                {grouping.groups.map((g) => (
                  <tr key={g.name} className="border-b border-line last:border-0">
                    <td className="py-2 pr-3 text-ink">{g.name}</td>
                    <td className="py-2 pr-3 text-right text-muted">{g.n}</td>
                    <td className={clsx("py-2 pr-3 text-right", g.atRiskPct >= 30 ? "text-critical-ink" : "text-ink-2")}>
                      {g.atRiskPct}%
                    </td>
                    {DIMENSIONS.map((d) => {
                      const ch = g.change?.[d];
                      return (
                        <td key={d} className="py-2 pr-3 text-right text-ink-2">
                          {Math.round(g.scores[d])}
                          {ch !== undefined && Math.abs(ch) >= 5 && (
                            <span className={clsx("ml-1 text-xs", ch < 0 ? "text-critical-ink" : "text-good-ink")}>
                              {ch < 0 ? "▼" : "▲"}
                              {Math.abs(Math.round(ch))}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="py-2 text-right text-ink-2">{g.namedReports}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-xs text-muted">
          Scores out of 100; ▲▼ = change over 3 weeks.{" "}
          {grouping.hidden > 0 && (
            <>
              {grouping.hidden} intern{grouping.hidden === 1 ? "" : "s"} not shown (groups under {data.minGroupSize}
              {tab !== "department" && ", or chose not to self-identify"}).
            </>
          )}
        </p>
      </div>

      <p className="flex items-start gap-1.5 border-t border-line pt-3 text-xs text-muted">
        <Lock size={12} className="mt-0.5 shrink-0" aria-hidden />
        Gender and ethnicity are optional self-ID via Slack /self-id ({data.selfIdPct}% of interns have shared).
        Shown only for groups of {data.minGroupSize}+, never per person, and never used in individual risk scores.
        Anonymous reports can&apos;t be attributed to any group.
      </p>
    </div>
  );
}
