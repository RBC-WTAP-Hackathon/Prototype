import clsx from "clsx";
import { DIMENSION_META } from "@/lib/dimensions";
import type { InternView } from "@/lib/types";
import { RiskBadge, TopTalentBadge } from "./ui";

export function InternTable({
  interns,
  onOpen,
  flashIds,
}: {
  interns: InternView[];
  onOpen: (id: string) => void;
  flashIds: Set<string>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs text-muted">
            <th className="py-2 pr-3 font-medium">Intern</th>
            <th className="py-2 pr-3 font-medium">Risk</th>
            <th className="py-2 pr-3 font-medium">Lowest area</th>
            <th className="py-2 pr-3 font-medium">Latest summary</th>
            <th className="py-2 font-medium text-right">Streak</th>
          </tr>
        </thead>
        <tbody>
          {interns.map((i) => (
            <tr
              key={i.user.id}
              onClick={() => onOpen(i.user.id)}
              className={clsx(
                "cursor-pointer border-b border-line last:border-0 hover:bg-surface-2",
                flashIds.has(i.user.id) && "flash",
              )}
            >
              <td className="py-2 pr-3">
                <div className="text-base text-ink">{i.user.name}</div>
                <div className="text-xs text-muted">{i.user.department}</div>
              </td>
              <td className="py-2 pr-3">
                <div className="flex flex-wrap gap-1">
                  <RiskBadge level={i.risk.level} score={i.risk.score} />
                  {i.topTalentAtRisk && <TopTalentBadge />}
                </div>
              </td>
              <td className="py-2 pr-3 text-ink-2 whitespace-nowrap">
                {DIMENSION_META[i.lowest].label} <span className="text-muted">· {i.radar[i.lowest]}</span>
              </td>
              <td className="max-w-xs py-2 pr-3 text-ink-2">
                <span className="line-clamp-1">{i.latestSummary ?? "—"}</span>
              </td>
              <td className="py-2 text-right text-ink-2 whitespace-nowrap">
                {i.streak} wk{!i.submittedThisWeek && <span className="ml-1 text-xs text-muted">(pending)</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
