import { concepts } from "../lib/study/content";
import type { Database } from "./client";
import * as s from "./schema";

export async function seedContent(db: Database) {
  await db.transaction(async (tx) => {
    for (const concept of concepts) {
      const { id, type, expression, reading, meaning, level, ...content } =
        concept;
      const entry = { id, type, expression, reading, meaning, level, content };
      await tx
        .insert(s.studyConcepts)
        .values(entry)
        .onConflictDoUpdate({ target: s.studyConcepts.id, set: entry });
      if (type === "vocabulary")
        await tx
          .insert(s.vocabularyItems)
          .values({ conceptId: id })
          .onConflictDoNothing();
      if (type === "kanji")
        await tx
          .insert(s.kanjiItems)
          .values({ conceptId: id })
          .onConflictDoNothing();
      if (type === "grammar")
        await tx
          .insert(s.grammarPoints)
          .values({ conceptId: id, formation: content.note })
          .onConflictDoUpdate({
            target: s.grammarPoints.conceptId,
            set: { formation: content.note },
          });
    }
  });
}
