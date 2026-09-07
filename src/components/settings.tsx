"use client";

import { useState, type FormEvent } from "react";
import { Check, Download, Save, Upload } from "lucide-react";
import {
  goalSchema,
  stateSchema,
  type StudyMode,
  type StudyState,
} from "@/lib/study/types";
import { useStudy } from "./study-provider";
import { Loading } from "./loading";
import { STORAGE_KEY } from "@/lib/storage/browser";

function GoalForm({ state }: { state: StudyState }) {
  const { dispatch, busy } = useStudy();
  const [targetDate, setTargetDate] = useState(state.goal.targetDate);
  const [dailyMinutes, setDailyMinutes] = useState(state.goal.dailyMinutes);
  const [newCardsPerDay, setNewCardsPerDay] = useState(
    state.goal.newCardsPerDay,
  );
  const [studyMode, setStudyMode] = useState(state.goal.studyMode);
  const [timeZone, setTimeZone] = useState(state.goal.timeZone);
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaved(false);
    const goal = goalSchema.safeParse({
      targetDate,
      dailyMinutes,
      newCardsPerDay,
      timeZone,
      targetLevel: "N4",
      studyMode,
    });
    if (!goal.success) {
      setMessage(goal.error.issues[0].message);
      return;
    }
    if (await dispatch({ type: "goal", goal: goal.data })) {
      setSaved(true);
      setMessage("Your settings are saved.");
    }
  }
  return (
    <form
      className="panel settings-panel"
      onSubmit={(event) => void submit(event)}
      onChange={() => {
        setSaved(false);
        setMessage("");
      }}
    >
      <div className="settings-section-heading">
        <span className="eyebrow">YOUR TARGET DATE</span>
        <h2>Give your practice a deadline.</h2>
        <p>The Progress page tracks your countdown and pace against this date.</p>
      </div>
      <label className="field-label" htmlFor="target-date">
        N4 target date
      </label>
      <input
        id="target-date"
        type="date"
        value={targetDate}
        onChange={(event) => setTargetDate(event.target.value)}
        required
      />
      <p className="field-help">
        January 15, 2027 is a starting point. Set your own goal date.
      </p>
      <div className="form-grid">
        <div>
          <label className="field-label" htmlFor="daily-minutes">
            Daily study budget
          </label>
          <select
            id="daily-minutes"
            value={dailyMinutes}
            onChange={(event) => setDailyMinutes(Number(event.target.value))}
          >
            {[10, 15, 20, 25, 30, 40, 60].map((value) => (
              <option key={value} value={value}>
                {value} minutes
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="study-mode">
            Active study mode
          </label>
          <select
            id="study-mode"
            value={studyMode}
            onChange={(event) => setStudyMode(event.target.value as StudyMode)}
          >
            <option value="N5">N5 foundations</option>
            <option value="N4">N4-only curriculum</option>
            <option value="tae-kim">Tae Kim course</option>
            <option value="kana">Kana mode</option>
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="target-level">
            Learning goal
          </label>
          <input id="target-level" value="JLPT N4" readOnly />
        </div>
        <div>
          <label className="field-label" htmlFor="new-cards-per-day">
            New cards per day: {newCardsPerDay}
          </label>
          <input
            id="new-cards-per-day"
            type="range"
            min={5}
            max={25}
            step={1}
            value={newCardsPerDay}
            onChange={(event) => setNewCardsPerDay(Number(event.target.value))}
          />
        </div>
      </div>
      <p className="field-help">
        N5 mode uses foundation content only. N4 mode uses N4-only content.
        Tae Kim mode is a separate personal-use course mined from real
        anime/drama dialogue, with its own audio and screenshots. Kana mode
        replaces Today with the hiragana/katakana chart, study, and quiz
        tools -- it has no daily queue of its own. All four tracks keep
        separate progress. New cards per day scales how many never-seen
        concepts a session pulls in, split proportionally across
        vocabulary/kanji/grammar/reading/listening -- it does not apply to
        Kana mode.
      </p>
      <label className="field-label" htmlFor="time-zone">
        Your time zone
      </label>
      <input
        id="time-zone"
        list="time-zones"
        value={timeZone}
        onChange={(event) => setTimeZone(event.target.value)}
        required
      />
      <datalist id="time-zones">
        {Intl.supportedValuesOf("timeZone").map((zone) => (
          <option key={zone} value={zone} />
        ))}
      </datalist>
      <p className="field-help">
        Used for the trip countdown and when a new study day begins.
      </p>
      <div className="form-footer">
        <button className="primary-button" disabled={busy} type="submit">
          {saved ? <Check size={16} /> : <Save size={16} />}
          {busy ? "Saving…" : "Save settings"}
        </button>
        <span
          role="status"
          className={saved ? "success-message" : "form-error"}
        >
          {message}
        </span>
      </div>
    </form>
  );
}

export function SettingsView() {
  const { state, mode, error, reload } = useStudy();
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  function exportData() {
    const raw = state
      ? JSON.stringify(state, null, 2)
      : localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const url = URL.createObjectURL(
      new Blob([raw], { type: "application/json" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "nihon-made-study-history.json";
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function importBrowserHistory() {
    if (!window.confirm("Import this browser history into your empty cloud workspace? The browser copy will be kept.")) return;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      setImportMessage("No browser history was found on this device.");
      return;
    }
    let history: StudyState;
    try {
      history = stateSchema.parse(JSON.parse(raw));
    } catch {
      setImportMessage("That browser history could not be read. Export it before resetting storage.");
      return;
    }
    setImporting(true);
    setImportMessage("");
    try {
      const response = await fetch("/api/study/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(history),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Your history could not be imported.");
      await reload();
      setImportMessage("Browser history imported. Your local copy was kept.");
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : "Your history could not be imported.");
    } finally {
      setImporting(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow" lang="ja">学習の設定</div>
          <h1 lang="ja">自分のペースで。</h1>
          <p lang="ja">毎日の日本語を、あなたらしく。</p>
        </div>
      </div>
      <div className="settings-layout">
        {state ? <GoalForm state={state} /> : !error ? <Loading /> : null}
        <aside className="panel data-panel">
          <span className="eyebrow">YOUR STUDY HISTORY</span>
          <h2>
            {mode === "browser"
              ? "At home on this device."
              : "Saved to your workspace."}
          </h2>
          <p>
            {mode === "browser"
              ? "Reviews and settings are saved in this browser. They stay here when you close the app, but won’t follow you to another device."
              : "Reviews and settings are saved to your PostgreSQL database, so you can pick up on another device."}
          </p>
          <p>Keep a copy of your progress whenever you like.</p>
          <button className="secondary-button" onClick={exportData}>
            <Download size={16} />
            Export study history
          </button>
          {mode === "database" ? (
            <>
              <button className="secondary-button" disabled={importing} onClick={() => void importBrowserHistory()}>
                <Upload size={16} />
                {importing ? "Importing…" : "Import browser history"}
              </button>
              <div className="data-note" role="status">{importMessage}</div>
            </>
          ) : null}
          <div className="data-note">
            {mode === "browser"
              ? "Clearing browser data also clears your study history. Export a copy first."
              : "Browser history from before database setup is kept separately and is not automatically imported."}
          </div>
        </aside>
      </div>
    </>
  );
}
