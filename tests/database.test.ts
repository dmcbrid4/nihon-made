import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import type { Database } from "../src/db/client";
import * as schema from "../src/db/schema";
import { PostgresRepository } from "../src/db/repository";
import { seedContent } from "../src/db/seed-content";
import { concepts } from "../src/lib/study/content";

test("SQL migration, idempotent seeds, ratings, rollback, completion, and goals persist in PostgreSQL", async () => {
    const client = new PGlite();
  try {
    await client.exec(await readFile("drizzle/0000_tough_malice.sql", "utf8"));
    await client.exec(await readFile("drizzle/0001_add_listening_concepts.sql", "utf8"));
    await client.exec(await readFile("drizzle/0002_vocabulary_progress_statuses.sql", "utf8"));
    await client.exec(await readFile("drizzle/0003_add_study_modes.sql", "utf8"));
    await client.exec(await readFile("drizzle/0004_add_tae_kim_mode.sql", "utf8"));
    await client.exec(await readFile("drizzle/0005_add_kana_mode.sql", "utf8"));
    await client.exec(await readFile("drizzle/0006_add_new_cards_per_day.sql", "utf8"));
    // The driver differs, but Drizzle's PostgreSQL query and transaction APIs are shared.
    const db = drizzle(client, { schema }) as unknown as Database;
    await seedContent(db);
    await seedContent(db);
    assert.equal((await db.select().from(schema.studyConcepts)).length, concepts.length);
    await db.insert(schema.studyConcepts).values({
      id: "retired-concept",
      type: "vocabulary",
      expression: "古いカード",
      reading: "ふるいかーど",
      meaning: "retired card",
      level: "N5",
      content: {
        example: "古いカードです。",
        exampleMeaning: "It is an old card.",
        note: "Test fixture.",
        topic: "Test",
        curriculumUnit: "Test",
        sequence: 999999,
        difficulty: 1,
        prerequisites: [],
        source: "Test",
      },
    });
    await seedContent(db);
    assert.equal((await db.select().from(schema.studyConcepts)).length, concepts.length);
    const userId = "00000000-0000-4000-8000-000000000001";
    const repository = new PostgresRepository(db, userId);
    const empty = await repository.load();
    assert.equal(empty.reviews.length, 0);
    const started = await repository.dispatch({
      type: "start",
      id: randomUUID(),
    });
    const session = started.sessions[0];
    assert.equal(session.mode, "N5");
    const action = {
      type: "review" as const,
      id: randomUUID(),
      sessionId: session.id,
      conceptId: session.conceptIds[0],
      rating: "hard" as const,
    };
    await repository.dispatch(action);
    await repository.dispatch(action);
    const reloaded = await new PostgresRepository(db, userId).load();
    assert.equal(reloaded.reviews.length, 1);
    assert.equal(reloaded.progress[0].reviewCount, 1);
    assert.equal(reloaded.progress[0].intervalDays, 1);
    await assert.rejects(
      repository.dispatch({
        ...action,
        id: randomUUID(),
        conceptId: "unknown",
      }),
    );
    assert.equal((await repository.load()).reviews.length, 1);
    for (const conceptId of session.conceptIds.slice(1))
      await repository.dispatch({ ...action, id: randomUUID(), conceptId });
    const finished = await repository.load();
    assert.equal(finished.reviews.length, 9);
    assert.ok(finished.sessions[0].completedAt);
    await seedContent(db);
    assert.equal((await repository.load()).reviews.length, 9);
    await repository.dispatch({
      type: "goal",
      goal: {
        ...finished.goal,
        targetDate: "2027-01-22",
        dailyMinutes: 40,
        studyMode: "N4",
        timeZone: "Asia/Tokyo",
      },
    });
    const final = await repository.load();
    assert.equal(final.goal.targetDate, "2027-01-22");
    assert.equal(final.goal.timeZone, "Asia/Tokyo");
    assert.equal(final.goal.studyMode, "N4");

    const importedUserId = "00000000-0000-4000-8000-000000000002";
    const importedSessionId = randomUUID();
    const importSource = {
      ...final,
      sessions: final.sessions.map((session) => ({ ...session, id: importedSessionId })),
      reviews: final.reviews.map((review) => ({
        ...review,
        id: randomUUID(),
        sessionId: importedSessionId,
      })),
    };
    const imported = await new PostgresRepository(db, importedUserId).importState(importSource);
    assert.deepEqual(imported, importSource);
    assert.deepEqual(await new PostgresRepository(db, importedUserId).load(), importSource);
    await assert.rejects(
      new PostgresRepository(db, importedUserId).importState(importSource),
      /Cloud history already contains study activity/,
    );

    // repeatSession, exercised against real Postgres: deletes reviews before
    // the session (no ON DELETE CASCADE on reviews.sessionId), cascades
    // study_session_items via the session delete, and forgets progress for
    // concepts that were unseen before this session entirely.
    const secondSession = (
      await repository.dispatch({ type: "start", id: randomUUID() })
    ).sessions.at(-1)!;
    for (const conceptId of secondSession.conceptIds)
      await repository.dispatch({
        type: "review",
        id: randomUUID(),
        sessionId: secondSession.id,
        conceptId,
        rating: "good",
      });
    const beforeRepeat = await repository.load();
    assert.ok(beforeRepeat.sessions.find((s) => s.id === secondSession.id)?.completedAt);
    const repeated = await repository.dispatch({
      type: "repeatSession",
      sessionId: secondSession.id,
    });
    assert.ok(!repeated.sessions.some((s) => s.id === secondSession.id));
    assert.ok(!repeated.reviews.some((r) => r.sessionId === secondSession.id));
    assert.deepEqual(await new PostgresRepository(db, userId).load(), repeated);
    await assert.rejects(
      repository.dispatch({ type: "repeatSession", sessionId: secondSession.id }),
      /finished session/,
    );
  } finally {
    await client.close();
  }
});
