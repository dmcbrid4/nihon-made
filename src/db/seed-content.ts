import { inArray, sql } from "drizzle-orm";
import { concepts } from "../lib/study/content";
import type { Database } from "./client";
import * as s from "./schema";

export async function seedContent(db: Database) {
  const entries = concepts.map((concept) => {
      const { id, type, expression, reading, meaning, level, ...content } =
        concept;
      return { id, type, expression, reading, meaning, level, content };
    });
  const batchSize = 200;
  for (let offset = 0; offset < entries.length; offset += batchSize) {
    const batch = entries.slice(offset, offset + batchSize);
    await db
      .insert(s.studyConcepts)
      .values(batch)
      .onConflictDoUpdate({
        target: s.studyConcepts.id,
        set: {
          type: sql`excluded.type`,
          expression: sql`excluded.expression`,
          reading: sql`excluded.reading`,
          meaning: sql`excluded.meaning`,
          level: sql`excluded.level`,
          content: sql`excluded.content`,
        },
      });

    const vocabulary = batch
      .filter((entry) => entry.type === "vocabulary")
      .map((entry) => ({
        conceptId: entry.id,
        partOfSpeech: entry.content.partOfSpeech ?? null,
      }));
    if (vocabulary.length)
      await db
        .insert(s.vocabularyItems)
        .values(vocabulary)
        .onConflictDoUpdate({
          target: s.vocabularyItems.conceptId,
          set: { partOfSpeech: sql`excluded.part_of_speech` },
        });

    const kanji = batch
      .filter((entry) => entry.type === "kanji")
      .map((entry) => ({ conceptId: entry.id }));
    if (kanji.length)
      await db.insert(s.kanjiItems).values(kanji).onConflictDoNothing();

    const grammar = batch
      .filter((entry) => entry.type === "grammar")
      .map((entry) => ({ conceptId: entry.id, formation: entry.content.note }));
    if (grammar.length)
      await db
        .insert(s.grammarPoints)
        .values(grammar)
        .onConflictDoUpdate({
          target: s.grammarPoints.conceptId,
          set: { formation: sql`excluded.formation` },
        });
  }

  // Retire content that is no longer in the shipped curriculum, but never
  // delete a card that is referenced by a learner's history.
  const activeIds = new Set(concepts.map((concept) => concept.id));
  const [stored, progress, sessionItems, reviewRows] = await Promise.all([
    db.select({ id: s.studyConcepts.id }).from(s.studyConcepts),
    db
      .select({ conceptId: s.userConceptProgress.conceptId })
      .from(s.userConceptProgress),
    db.select({ conceptId: s.studySessionItems.conceptId }).from(s.studySessionItems),
    db.select({ conceptId: s.reviews.conceptId }).from(s.reviews),
  ]);
  const referencedIds = new Set([
    ...progress.map((item) => item.conceptId),
    ...sessionItems.map((item) => item.conceptId),
    ...reviewRows.map((item) => item.conceptId),
  ]);
  const retiredIds = stored
    .map((item) => item.id)
    .filter((id) => !activeIds.has(id) && !referencedIds.has(id));
  if (retiredIds.length)
    await db
      .delete(s.studyConcepts)
      .where(inArray(s.studyConcepts.id, retiredIds));
}
