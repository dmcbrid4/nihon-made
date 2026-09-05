"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  Headphones,
  Languages,
  Layers3,
  PenLine,
} from "lucide-react";
import { concepts } from "@/lib/study/content";
import { useStudy } from "./study-provider";

const skills = [
  { type: "vocabulary", label: "Vocabulary", icon: Languages },
  { type: "kanji", label: "Kanji", icon: PenLine },
  { type: "grammar", label: "Grammar", icon: Layers3 },
  { type: "reading", label: "Reading", icon: BookOpen },
  { type: "listening", label: "Listening", icon: Headphones },
];

export function ProgressOverview({ showLink = true }: { showLink?: boolean }) {
  const { state } = useStudy();
  if (!state) return null;
  return (
    <section className="progress-section" aria-labelledby="progress-heading">
      <div className="section-heading">
        <div>
          <h2 id="progress-heading">Your foundations</h2>
          <p>Understanding that grows with you.</p>
        </div>
        {showLink && (
          <Link href="/progress" className="text-link">
            View progress <ArrowUpRight size={15} />
          </Link>
        )}
      </div>
      <div className="progress-grid">
        {skills.map(({ type, label, icon: Icon }) => {
          const ids = concepts
            .filter((item) => item.type === type)
            .map((item) => item.id);
          const explored = state.progress.filter((item) =>
            ids.includes(item.conceptId),
          );
          const learned = explored.filter(
            (item) => item.status === "learned",
          ).length;
          return (
            <div key={type} className="skill-card">
              <div className="skill-card-heading">
                <Icon size={17} strokeWidth={1.6} />
                <span>{label}</span>
              </div>
              <div className="skill-count">
                {ids.length ? (
                  <>
                    <strong>{explored.length}</strong>
                    <span>/ {ids.length}</span>
                  </>
                ) : (
                  <strong className="not-yet">Coming later</strong>
                )}
              </div>
              <div
                className="progress-track"
                role={ids.length ? "progressbar" : undefined}
                aria-label={
                  ids.length ? `${label} concepts explored` : undefined
                }
                aria-valuenow={ids.length ? explored.length : undefined}
                aria-valuemin={ids.length ? 0 : undefined}
                aria-valuemax={ids.length || undefined}
              >
                <span
                  className="progress-learning"
                  style={{
                    width: `${ids.length ? (explored.length / ids.length) * 100 : 0}%`,
                  }}
                />
                <span
                  className="progress-learned"
                  style={{
                    width: `${ids.length ? (learned / ids.length) * 100 : 0}%`,
                  }}
                />
              </div>
              <p>
                {ids.length
                  ? "starter concepts explored"
                  : "Audio practice is on the way"}
              </p>
            </div>
          );
        })}
      </div>
      <p className="progress-note">
        Based on your reviews in the starter collection. This is not an estimate
        of JLPT readiness.
      </p>
    </section>
  );
}
