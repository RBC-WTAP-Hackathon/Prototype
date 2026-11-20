"use client";
import { useState } from "react";
import clsx from "clsx";
import { EyeOff, Handshake, MessageSquare } from "lucide-react";
import type { DashboardData } from "@/lib/types";
import { Button } from "./ui";

type Item = DashboardData["inbox"][number];
type Filter = "all" | Item["kind"];

const KIND = {
  feedback: { label: "Feedback", Icon: MessageSquare, cls: "bg-rbc-sky text-rbc-blue" },
  intro: { label: "Intro request", Icon: Handshake, cls: "bg-rbc-yellow/30 text-rbc-navy" },
} as const;

/** Feedback and intro requests sent from the Slack bot menu. */
export function InboxList({ items, onDone }: { items: Item[]; onDone: (id: string) => void }) {
  const [filter, setFilter] = useState<Filter>("all");
  const shown = filter === "all" ? items : items.filter((i) => i.kind === filter);
  const count = (f: Filter) => (f === "all" ? items : items.filter((i) => i.kind === f)).filter((i) => i.status === "New").length;

  return (
    <div>
      <div className="mb-3 inline-flex border border-input-stroke font-ui text-xs" role="tablist">
        {(["all", "feedback", "intro"] as Filter[]).map((f) => (
          <button
            key={f}
            role="tab"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            className={clsx(
              "px-2.5 py-1 transition",
              filter === f ? "bg-accent text-white" : "bg-white text-rbc-navy hover:bg-surface-2",
            )}
          >
            {f === "all" ? "All" : KIND[f].label + "s"}
            {count(f) > 0 && <span className="ml-1 opacity-80">({count(f)})</span>}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="text-sm text-muted">Nothing here yet.</p>
      ) : (
        <ul className="space-y-2">
          {shown.map((i) => {
            const { label, Icon, cls } = KIND[i.kind];
            return (
              <li key={i.id} className={clsx("border border-line p-3", i.status === "Done" && "opacity-60")}>
                <div className="flex items-start justify-between gap-2">
                  <span className={clsx("inline-flex items-center gap-1 px-1.5 py-0.5 font-ui text-xs", cls)}>
                    <Icon size={12} aria-hidden /> {label}
                  </span>
                  {i.status === "New" ? (
                    <Button variant="ghost" className="!px-2 !py-0.5 text-xs" onClick={() => onDone(i.id)}>
                      Mark done
                    </Button>
                  ) : (
                    <span className="text-xs text-muted">Done</span>
                  )}
                </div>
                <p className="mt-1.5 text-sm font-medium text-ink">
                  {i.kind === "intro" ? `Wants to meet: ${i.topic}` : i.topic}
                </p>
                {i.text && <p className="mt-0.5 text-sm text-ink-2">{i.text}</p>}
                <div className="mt-1 flex items-center gap-1 text-xs text-muted">
                  {i.anonymous ? (
                    <>
                      <EyeOff size={12} aria-hidden /> Anonymous
                    </>
                  ) : (
                    <>From {i.from ?? "unknown"}</>
                  )}
                  <span>· {new Date(i.created_at).toLocaleDateString()}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
