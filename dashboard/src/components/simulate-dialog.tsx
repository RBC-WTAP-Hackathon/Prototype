"use client";
import { useState } from "react";
import { X } from "lucide-react";
import { SELF_DIMENSIONS, DIMENSION_META } from "@/lib/dimensions";
import type { InternView, SelfDimension } from "@/lib/types";
import { Button } from "./ui";

const PRESET = {
  text: "Honestly a rough week. Worked late every night and my idea in the team meeting got brushed off again. Another bank's recruiter reached out and I'm tempted.",
  ratings: { role_satisfaction: 2, rbc_satisfaction: 2, learning_growth: 3, voice_valued: 1 } as Record<SelfDimension, number>,
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
        <div className="mt-3 space-y-2">
          {SELF_DIMENSIONS.map((d) => (
            <div key={d} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-ink-2">{DIMENSION_META[d].label}</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setRatings({ ...ratings, [d]: n })}
                    className={`h-7 w-7 rounded-md border text-xs font-medium ${
                      ratings[d] === n ? "border-accent bg-accent text-white" : "border-line text-ink-2 hover:bg-surface-2"
                    }`}
                    aria-pressed={ratings[d] === n}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
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
