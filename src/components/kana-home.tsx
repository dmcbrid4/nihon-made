"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, GraduationCap, ShieldCheck } from "lucide-react";
import { concepts } from "@/lib/study/content";
import { kanaMilestones, kanaOverview, kanaScriptProgress } from "@/lib/study/kana-progress";
import type { KanaScript } from "@/lib/study/types";
import { useStudy } from "./study-provider";
import { Loading } from "./loading";

const scriptCopy: Record<KanaScript, { title: string; blurb: string }> = {
  hiragana: {
    title: "Hiragana",
    blurb: "Native Japanese words and grammar (です, から, てform, particles).",
  },
  katakana: {
    title: "Katakana",
    blurb: "Foreign loanwords, names, and emphasis (コーヒー, アメリカ).",
  },
};

function ScriptCard({ script }: { script: KanaScript }) {
  const { state } = useStudy();
  if (!state) return null;
  const cohorts = kanaScriptProgress(state, script);
  const total = cohorts.find((c) => c.id === "total")!;
  const percent = total.total ? Math.round((total.mastered / total.total) * 100) : 0;
  const basic = cohorts.find((c) => c.id === "basic");
  return (
    <div className="panel kana-script-card">
      <div className="kana-script-card-top">
        <div>
          <h2 lang="ja">{scriptCopy[script].title}</h2>
          <p>{scriptCopy[script].blurb}</p>
        </div>
        <span className="kana-script-percent">{percent}%</span>
      </div>
      {basic && (
        <p className="kana-script-stat">
          {basic.mastered} / {basic.total} basic kana mastered
        </p>
      )}
      <div className="kana-bucket-list">
        {cohorts
          .filter((c) => c.id !== "total")
          .map((cohort) => (
            <div key={cohort.id} className="kana-bucket-row">
              <span>{cohort.label}</span>
              <span className="kana-bucket-track">
                <span
                  style={{
                    width: `${cohort.total ? (cohort.mastered / cohort.total) * 100 : 0}%`,
                  }}
                />
              </span>
              <span className="muted">
                {cohort.mastered}/{cohort.total}
              </span>
            </div>
          ))}
      </div>
      <Link href={`/kana/${script}`} className="primary-button">
        Study {scriptCopy[script].title}
        <ArrowRight size={17} />
      </Link>
      <Link href={`/kana/${script}?tab=chart`} className="text-link">
        View {scriptCopy[script].title.toLowerCase()} chart
      </Link>
    </div>
  );
}

function KnownShortcuts() {
  const { state, dispatch, busy } = useStudy();
  const [message, setMessage] = useState("");
  if (!state) return null;
  const kanaConceptIds = concepts.filter((c) => c.type === "kana").map((c) => c.id);
  const byScript = (script: KanaScript) =>
    concepts
      .filter((c) => c.type === "kana" && c.kanaDetails?.script === script)
      .map((c) => c.id);

  async function markKnown(ids: string[], label: string) {
    if (!window.confirm(`Mark ${label} as already known? You can still review them normally any time.`))
      return;
    const next = await dispatch({ type: "markKanaKnown", conceptIds: ids });
    if (next) setMessage(`${label} marked as known.`);
  }

  return (
    <section className="panel kana-shortcuts">
      <div className="section-heading">
        <div>
          <h2>Already know kana?</h2>
          <p>
            Skip straight past what you already know. This marks it mastered
            immediately -- no need to grind through cards you can already read.
          </p>
        </div>
      </div>
      <div className="kana-shortcut-buttons">
        <button
          className="secondary-button"
          disabled={busy}
          onClick={() => void markKnown(byScript("hiragana"), "all of Hiragana")}
        >
          <ShieldCheck size={16} />
          Mark Hiragana known
        </button>
        <button
          className="secondary-button"
          disabled={busy}
          onClick={() => void markKnown(byScript("katakana"), "all of Katakana")}
        >
          <ShieldCheck size={16} />
          Mark Katakana known
        </button>
        <button
          className="secondary-button"
          disabled={busy}
          onClick={() => void markKnown(kanaConceptIds, "the entire kana foundation")}
        >
          <GraduationCap size={16} />
          Skip Kana mode entirely
        </button>
      </div>
      {message && (
        <p className="success-message" role="status">
          <Check size={13} /> {message}
        </p>
      )}
      <p className="field-help">
        You can also mark just one row known once you&rsquo;re inside a
        script&rsquo;s chart -- click a character, then &ldquo;Mark
        known&rdquo;.
      </p>
    </section>
  );
}

export function KanaHome() {
  const { state } = useStudy();
  if (!state) return <Loading />;
  const overview = kanaOverview(state);
  const milestones = kanaMilestones(state).filter((m) => m.complete);
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">WRITING SYSTEMS</div>
          <h1>Kana</h1>
          <p>
            Hiragana overall {overview.hiragana}% · Katakana overall {overview.katakana}%
          </p>
        </div>
      </div>
      <section className="panel kana-intro">
        <p>
          Japanese is written with two phonetic syllabaries -- <strong>hiragana</strong>{" "}
          and <strong>katakana</strong> -- used constantly alongside kanji.
          Hiragana carries native words and grammar; katakana marks foreign
          loanwords, names, and emphasis. Each character is one mora (a
          beat of sound), not a letter -- learn the shapes and sounds here,
          and the rest of your Japanese reading gets much easier.
        </p>
      </section>
      <div className="kana-script-grid">
        <ScriptCard script="hiragana" />
        <ScriptCard script="katakana" />
      </div>
      {!!milestones.length && (
        <section className="panel kana-milestones">
          <div className="section-heading">
            <div>
              <h2>Milestones reached</h2>
            </div>
          </div>
          <ul className="milestone-list">
            {milestones.map((m) => (
              <li key={`${m.script}-${m.bucket}`}>
                <Check size={14} /> {m.label}
              </li>
            ))}
          </ul>
        </section>
      )}
      <KnownShortcuts />
    </>
  );
}
