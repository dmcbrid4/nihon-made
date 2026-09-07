"use client";

import { useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import { daysUntil, formatTargetDate } from "@/lib/study/dates";
import { pacing } from "@/lib/study/progress-metrics";
import { useStudy } from "./study-provider";

const paceCopy: Record<string, { label: string; className: string }> = {
  complete: { label: "N4 vocabulary complete", className: "pace-complete" },
  ahead: { label: "Ahead of pace", className: "pace-ahead" },
  "on-pace": { label: "On pace", className: "pace-on" },
  behind: { label: "Behind pace", className: "pace-behind" },
  unknown: { label: "Building up pace data", className: "pace-unknown" },
};

export function ProgressCountdown() {
  const { state, now, dispatch, busy } = useStudy();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  if (!state) return null;
  const days = daysUntil(state.goal.targetDate, now, state.goal.timeZone);
  const pace = pacing(state, now, "vocabulary");
  const status = paceCopy[pace.status];

  function startEditing() {
    setDraft(state!.goal.targetDate);
    setError("");
    setEditing(true);
  }

  async function save() {
    if (!draft) return;
    const next = await dispatch({ type: "goal", goal: { ...state!.goal, targetDate: draft } });
    if (next) setEditing(false);
    else setError("Couldn’t save that date. Try again.");
  }

  return (
    <section className="panel countdown-card" aria-label="N4 target countdown">
      <div className="countdown-topline">
        <span className="eyebrow">N4 TARGET</span>
        {editing ? (
          <form
            className="countdown-edit"
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
          >
            <input
              type="date"
              value={draft}
              aria-label="Target date"
              onChange={(event) => setDraft(event.target.value)}
              required
            />
            <button className="icon-button" type="submit" aria-label="Save target date" disabled={busy}>
              <Check size={15} />
            </button>
            <button
              className="icon-button"
              type="button"
              aria-label="Cancel editing target date"
              onClick={() => setEditing(false)}
            >
              <X size={15} />
            </button>
          </form>
        ) : (
          <button className="icon-button" aria-label="Edit target date" onClick={startEditing}>
            <Pencil size={15} />
          </button>
        )}
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="countdown-body">
        <div className="countdown-number">
          <strong>{days}</strong>
          <span>{days === 1 ? "day remaining" : "days remaining"}</span>
        </div>
        <div className="countdown-meta">
          <p>Target: {formatTargetDate(state.goal.targetDate)}</p>
          <span className={`pace-badge ${status.className}`}>{status.label}</span>
        </div>
      </div>
    </section>
  );
}
