import { concepts } from "./content";
import { dateInZone } from "./dates";
import type { Concept, StudyState } from "./types";

export const minutesPerType = {
  vocabulary: 1,
  kanji: 1,
  grammar: 3,
  reading: 4,
  listening: 4,
};

export function currentSession(state: StudyState, now: Date) {
  return (
    state.sessions.find((session) => !session.completedAt) ??
    state.sessions.findLast(
      (session) => session.date === dateInZone(now, state.goal.timeZone),
    )
  );
}

export function planSession(state: StudyState, now: Date): Concept[] {
  const progress = new Map(
    state.progress.map((item) => [item.conceptId, item]),
  );
  const due = concepts
    .filter((item) => {
      const entry = progress.get(item.id);
      return entry && Date.parse(entry.dueAt) <= now.getTime();
    })
    .sort(
      (a, b) =>
        Date.parse(progress.get(a.id)!.dueAt) -
        Date.parse(progress.get(b.id)!.dueAt),
    );
  const unseen = concepts
    .filter((item) => !progress.has(item.id))
    .sort((a, b) => a.sequence - b.sequence);
  const selected: Concept[] = [];
  let minutes = 0;
  const add = (item: Concept) => {
    const cost = minutesPerType[item.type];
    if (
      minutes + cost <= state.goal.dailyMinutes &&
      !selected.some((c) => c.id === item.id)
    ) {
      selected.push(item);
      minutes += cost;
    }
  };
  // Due reviews get priority. New material is deliberately capped for a short,
  // balanced starter session rather than filling the time budget with new cards.
  due.forEach(add);
  const limits = { vocabulary: 4, kanji: 2, grammar: 1, reading: 1, listening: 1 };
  for (const type of ["vocabulary", "kanji", "grammar", "reading", "listening"] as const) {
    unseen
      .filter((item) => item.type === type)
      .slice(0, limits[type])
      .forEach(add);
  }
  return selected;
}

export function sessionMinutes(items: Concept[]): number {
  return items.reduce((sum, item) => sum + minutesPerType[item.type], 0);
}
