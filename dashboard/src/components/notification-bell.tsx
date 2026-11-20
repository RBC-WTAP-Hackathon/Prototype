"use client";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Bell, TrendingDown } from "lucide-react";
import type { StatusAlert } from "@/lib/types";
import { RiskBadge } from "./ui";

const READ_KEY = "talentpulse:read-alerts";

function loadRead(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(READ_KEY) ?? "[]"));
  } catch {
    return new Set();
  }
}

function saveRead(ids: Set<string>) {
  try {
    localStorage.setItem(READ_KEY, JSON.stringify([...ids]));
  } catch {
    /* storage unavailable — read state just won't persist */
  }
}

/** Header bell: interns whose risk status worsened significantly since last week's summary. */
export function NotificationBell({
  alerts,
  onOpenIntern,
}: {
  alerts: StatusAlert[];
  onOpenIntern: (userId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [read, setRead] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setRead(loadRead()), []);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const unread = alerts.filter((a) => !read.has(a.id)).length;

  const markRead = (ids: string[]) => {
    const next = new Set(read);
    ids.forEach((id) => next.add(id));
    setRead(next);
    saveRead(next);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative grid h-10 w-10 place-items-center text-rbc-navy transition hover:bg-surface-2"
        aria-label={`Notifications: ${unread} unread`}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Bell size={22} aria-hidden />
        {unread > 0 && (
          <span className="absolute right-1 top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-critical px-1 font-ui text-[11px] font-bold leading-none text-white">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Status changes since last report"
          className="absolute right-0 top-12 z-30 w-[min(400px,calc(100vw-2rem))] border border-card-border bg-white shadow-xl"
        >
          <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
            <div>
              <h2 className="text-lg font-medium text-heading">Status changes</h2>
              <p className="text-sm text-muted">Significant drops since last week&apos;s report</p>
            </div>
            {unread > 0 && (
              <button
                onClick={() => markRead(alerts.map((a) => a.id))}
                className="shrink-0 font-ui text-sm text-accent hover:text-accent-ink hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          {alerts.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted">No significant changes since last report.</p>
          ) : (
            <ul className="max-h-[420px] overflow-y-auto">
              {alerts.map((a) => {
                const isUnread = !read.has(a.id);
                return (
                  <li key={a.id} className="border-b border-line last:border-0">
                    <button
                      onClick={() => {
                        markRead([a.id]);
                        setOpen(false);
                        onOpenIntern(a.userId);
                      }}
                      className={clsx(
                        "flex w-full gap-3 px-4 py-3 text-left transition hover:bg-rbc-sky",
                        isUnread && "bg-[#f3f7f8]",
                      )}
                    >
                      <TrendingDown size={18} className="mt-0.5 shrink-0 text-critical" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-base text-ink">{a.name}</span>
                          {isUnread && <span className="h-2 w-2 shrink-0 rounded-full bg-accent" aria-label="Unread" />}
                        </div>
                        <div className="text-xs text-muted">{a.department}</div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <RiskBadge level={a.fromLevel} score={a.fromScore} />
                          <span className="text-muted" aria-label="to">→</span>
                          <RiskBadge level={a.toLevel} score={a.toScore} />
                        </div>
                        {a.reasons.length > 0 && (
                          <p className="mt-1.5 text-sm text-ink-2">{a.reasons.join(" · ")}</p>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
