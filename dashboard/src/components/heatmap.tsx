import { DIMENSIONS, DIMENSION_META } from "@/lib/dimensions";
import { MIN_GROUP_SIZE } from "@/lib/scoring";
import type { DashboardData } from "@/lib/types";

/** Diverging around a neutral 60: red = below, blue = above. Values are always printed — color never carries meaning alone. */
function cell(v: number): { bg: string; fg: string } {
  if (v < 45) return { bg: "var(--div-neg-2)", fg: "#fff" };
  if (v < 55) return { bg: "var(--div-neg-1)", fg: "var(--ink)" };
  if (v < 68) return { bg: "var(--div-mid)", fg: "var(--ink)" };
  if (v < 78) return { bg: "var(--div-pos-1)", fg: "var(--ink)" };
  return { bg: "var(--div-pos-2)", fg: "#fff" };
}

export function DepartmentHeatmap({ rows }: { rows: DashboardData["heatmap"] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-separate border-spacing-0.5 text-xs">
        <thead>
          <tr>
            <th className="px-2 py-1 text-left font-medium text-muted">Department</th>
            {DIMENSIONS.map((d) => (
              <th key={d} className="px-1 py-1 text-center font-medium text-muted" title={DIMENSION_META[d].label}>
                {DIMENSION_META[d].short}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.department}>
              <td className="px-2 py-1.5 whitespace-nowrap text-ink-2">
                {r.department} <span className="text-muted">({r.n})</span>
              </td>
              {r.scores
                ? DIMENSIONS.map((d) => {
                    const v = r.scores![d];
                    const c = cell(v);
                    return (
                      <td
                        key={d}
                        className="rounded px-1 py-1.5 text-center font-medium"
                        style={{ background: c.bg, color: c.fg }}
                        title={`${r.department} · ${DIMENSION_META[d].label}: ${v}/100`}
                      >
                        {v}
                      </td>
                    );
                  })
                : (
                  <td colSpan={DIMENSIONS.length} className="px-2 py-1.5 text-center italic text-muted">
                    Hidden — fewer than {MIN_GROUP_SIZE} interns
                  </td>
                )}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 flex items-center gap-2 text-[11px] text-muted">
        <span>Lower</span>
        {[30, 50, 60, 72, 85].map((v) => (
          <span key={v} className="h-2.5 w-6 rounded-sm" style={{ background: cell(v).bg }} />
        ))}
        <span>Higher · score out of 100</span>
      </div>
    </div>
  );
}
