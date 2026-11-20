"use client";
import { useState } from "react";
import { X } from "lucide-react";
import { CHECKIN_SCALE_MAX, SELF_DIMENSIONS, DIMENSION_META } from "@/lib/dimensions";
import type { InternView, SelfDimension } from "@/lib/types";
import { Button } from "./ui";

const PRESET = {
  text: "Honestly a rough week. Worked late every night and my idea in the team meeting got brushed off again. Another bank's recruiter reached out and I'm tempted.",
  ratings: { role_satisfaction: 3, rbc_satisfaction: 3, learning_growth: 5, voice_valued: 2, participation: 2 } as Record<SelfDimension, number>,
};

/** Demo backup for the Slack /checkin modal — posts through the exact same pipeline. */
export function SimulateDialog({
  interns,
  onClose,
  onSubmitted,
}: {
  interns: InternView[];
  onClose: () => void;
  onSubmitted: (userId: string) => void;
}) {
  const [userId, setUserId] = useState(interns.find((i) => i.topTalentAtRisk)?.user.id ?? interns[0]?.user.id);
  const [ratings, setRatings] = useState(PRESET.ratings);
  const [text, setText] = useState(PRESET.text);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, ...ratings, feedback_text: text }),
    });
    setBusy(false);
    if (!res.ok) return setErr((await res.json()).error);
    onSubmitted(userId!);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button className="absolute inset-0 bg-black/40" onClick={onClose} aria-label="Close" />
      <div className="relative w-full max-w-md rounded-xl border border-card-border bg-surface p-6 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-medium text-heading">Simulate Slack check-in</h2>
          <Button variant="ghost" onClick={onClose} aria-label="Close">
            <X size={16} />
          </Button>
        </div>
        <label className="block text-xs font-medium text-ink-2">
          Intern
          <select
            className="mt-1 w-full rounded-sm border border-input-stroke bg-white px-2 py-1.5 text-sm text-ink"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          >
            {interns.map((i) => (
              <option key={i.user.id} value={i.user.id}>
                {i.user.name} — {i.user.department}
              </option>
            ))}
          </select>
        </label>
        <div className="mt-4 space-y-4">
          {SELF_DIMENSIONS.map((d) => (
            <label key={d} className="block text-sm">
              <span className="flex items-baseline justify-between gap-3">
                <span className="text-ink-2">{DIMENSION_META[d].label}</span>
                <span className="font-ui font-bold text-rbc-navy">
                  {ratings[d]} <span className="font-normal text-muted">/ {CHECKIN_SCALE_MAX}</span>
                </span>
              </span>
              <input
                type="range"
                min={1}
                max={CHECKIN_SCALE_MAX}
                step={1}
                value={ratings[d]}
                onChange={(e) => setRatings({ ...ratings, [d]: Number(e.target.value) })}
                className="mt-1.5 w-full cursor-pointer accent-[var(--accent)]"
                aria-valuetext={`${ratings[d]} out of ${CHECKIN_SCALE_MAX}`}
              />
              <span className="flex justify-between font-ui text-[11px] text-muted" aria-hidden>
                <span>1</span>
                <span>{CHECKIN_SCALE_MAX}</span>
              </span>
            </label>
          ))}
        </div>
        <label className="mt-3 block text-xs font-medium text-ink-2">
          Anything on your mind?
          <textarea
            className="mt-1 h-24 w-full rounded-sm border border-input-stroke bg-white p-2 text-sm text-ink"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </label>
        {err && <p className="mt-2 text-sm text-critical-ink">{err}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit} disabled={busy}>
            {busy ? "Analysing…" : "Submit check-in"}
          </Button>
        </div>
      </div>
    </div>
  );
}
