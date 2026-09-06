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

test("SQL migration, idempotent seeds, ratings, rollback, completion, and goals persist in PostgreSQL", async () => {
  const client = new PGlite();
  try {
    await client.exec(await readFile("drizzle/0000_tough_malice.sql", "utf8"));
    // The driver differs, but Drizzle's PostgreSQL query and transaction APIs are shared.
    const db = drizzle(client, { schema }) as unknown as Database;
    await seedContent(db);
    await seedContent(db);
    assert.equal((await db.select().from(schema.studyConcepts)).length, 19);
    const userId = "00000000-0000-4000-8000-000000000001";
    const repository = new PostgresRepository(db, userId);
    const empty = await repository.load();
    assert.equal(empty.reviews.length, 0);
    const started = await repository.dispatch({
      type: "start",
      id: randomUUID(),
    });
    const session = started.sessions[0];
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
    assert.equal(finished.reviews.length, 8);
    assert.ok(finished.sessions[0].completedAt);
    await seedContent(db);
    assert.equal((await repository.load()).reviews.length, 8);
    await repository.dispatch({
      type: "goal",
      goal: {
        ...finished.goal,
        targetDate: "2027-01-22",
        dailyMinutes: 40,
        timeZone: "Asia/Tokyo",
      },
    });
    const final = await repository.load();
    assert.equal(final.goal.targetDate, "2027-01-22");
    assert.equal(final.goal.timeZone, "Asia/Tokyo");

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
  } finally {
    await client.close();
  }
});
