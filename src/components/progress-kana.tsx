"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { kanaMilestones, kanaOverview, kanaScriptProgress } from "@/lib/study/kana-progress";
import type { KanaScript } from "@/lib/study/types";
import { useStudy } from "./study-provider";

const scriptLabel: Record<KanaScript, string> = { hiragana: "Hiragana", katakana: "Katakana" };

export function ProgressKana() {
  const { state } = useStudy();
  if (!state) return null;
  const overview = kanaOverview(state);
  const milestones = kanaMilestones(state);
  const completed = milestones.filter((m) => m.complete).length;
  return (
    <section className="panel kana-progress-section" aria-label="Kana progress">
      <div className="section-heading">
        <div>
          <h2>Kana foundations</h2>
          <p>
            Hiragana and katakana are foundational writing-system knowledge,
            not an N5/N4 curriculum category -- tracked separately here.
          </p>
        </div>
        <Link href="/kana" className="text-link">
          Open Kana <ArrowUpRight size={16} />
        </Link>
      </div>
      <div className="kana-progress-summary">
        <div>
          <span className="kana-progress-percent">{overview.hiragana}%</span>
          <span>Hiragana</span>
        </div>
        <div>
          <span className="kana-progress-percent">{overview.katakana}%</span>
          <span>Katakana</span>
        </div>
      </div>
      {(["hiragana", "katakana"] as const).map((script) => (
        <div key={script} className="kana-progress-script">
          <h3>{scriptLabel[script]}</h3>
          <div className="kana-bucket-list">
            {kanaScriptProgress(state, script)
              .filter((cohort) => cohort.id !== "total")
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
        </div>
      ))}
      <p className="progress-note">
        {completed} of {milestones.length} kana milestones complete. A
        character is &ldquo;mastered&rdquo; once both its recognition
        (symbol → sound) and recall (sound → symbol) reach the same
        three-good-reviews bar used everywhere else in this app.
      </p>
    </section>
  );
}
