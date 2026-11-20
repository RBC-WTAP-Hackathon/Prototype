import clsx from "clsx";
import { EyeOff, ShieldAlert } from "lucide-react";
import type { InternView, Report } from "@/lib/types";
import { Button } from "./ui";

export function ReportsList({
  reports,
  interns,
  onReview,
}: {
  reports: Report[];
  interns: InternView[];
  onReview: (id: string) => void;
}) {
  if (!reports.length) return <p className="text-sm text-muted">No reports.</p>;
  return (
    <ul className="space-y-2">
      {reports.map((r) => {
        const who = r.user_id ? interns.find((i) => i.user.id === r.user_id)?.user.name : null;
        return (
          <li
            key={r.id}
            className={clsx("rounded-sm border border-line p-3", r.status === "Reviewed" && "opacity-60")}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs">
                {r.urgency === "High" && <ShieldAlert size={14} className="text-critical" aria-hidden />}
                <span className="font-medium text-ink">{r.category}</span>
                <span className="text-muted">· {r.urgency} urgency</span>
              </div>
              {r.status === "Open" ? (
                <Button variant="ghost" className="!px-2 !py-0.5 text-xs" onClick={() => onReview(r.id)}>
                  Mark reviewed
                </Button>
              ) : (
                <span className="text-xs text-muted">Reviewed</span>
              )}
            </div>
            <p className="mt-1 text-sm text-ink-2">{r.description}</p>
            <div className="mt-1 flex items-center gap-1 text-xs text-muted">
              {r.anonymous ? (
                <>
                  <EyeOff size={12} aria-hidden /> Anonymous — identity not stored
                </>
              ) : (
                <>From {who ?? "unknown"}</>
              )}
              <span>· {new Date(r.created_at).toLocaleDateString()}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
