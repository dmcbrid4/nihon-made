"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import {
  kanaMilestones,
  kanaOverview,
  kanaScriptProgress,
} from "@/lib/study/kana-progress";
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
  const percent = total.total
    ? Math.round((total.mastered / total.total) * 100)
    : 0;
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
            Hiragana overall {overview.hiragana}% · Katakana overall{" "}
            {overview.katakana}%
          </p>
        </div>
      </div>
      <section className="panel kana-intro">
        <p>
          Japanese is written with two phonetic syllabaries --{" "}
          <strong>hiragana</strong> and <strong>katakana</strong> -- used
          constantly alongside kanji. Hiragana carries native words and grammar;
          katakana marks foreign loanwords, names, and emphasis. Each character
          is one mora (a beat of sound), not a letter -- learn the shapes and
          sounds here, and the rest of your Japanese reading gets much easier.
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
    </>
  );
}
