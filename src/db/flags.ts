import { and, desc, eq } from "drizzle-orm";
import { conceptById } from "../lib/study/content";
import type { Database } from "./client";
import * as s from "./schema";

export type ConceptFlag = {
  id: string;
  conceptId: string;
  note: string;
  createdAt: string;
  resolvedAt: string | null;
};

type FlagRow = typeof s.conceptFlags.$inferSelect;

// timestamp(..., { mode: "string" }) columns come back from the driver in
// Postgres's own format, not ISO 8601 -- normalize the same way
// repository.ts's transact() does for StudyState's date fields.
function toIso(row: FlagRow): ConceptFlag {
  return {
    ...row,
    createdAt: new Date(row.createdAt).toISOString(),
    resolvedAt: row.resolvedAt ? new Date(row.resolvedAt).toISOString() : null,
  };
}

export async function listFlags(
  db: Database,
  userId: string,
): Promise<ConceptFlag[]> {
  const rows = await db
    .select()
    .from(s.conceptFlags)
    .where(eq(s.conceptFlags.userId, userId))
    .orderBy(desc(s.conceptFlags.createdAt));
  return rows.map(toIso);
}

export async function createFlag(
  db: Database,
  userId: string,
  input: { id: string; conceptId: string; note: string },
): Promise<ConceptFlag> {
  if (!conceptById.has(input.conceptId))
    throw new Error(`Unknown concept id: ${input.conceptId}`);
  return db.transaction(async (tx) => {
    // A fresh account may reach this route before /api/study ever loads.
    await tx
      .insert(s.users)
      .values({ id: userId, name: "Personal learner" })
      .onConflictDoNothing();
    const [flag] = await tx
      .insert(s.conceptFlags)
      .values({
        id: input.id,
        userId,
        conceptId: input.conceptId,
        note: input.note,
        createdAt: new Date().toISOString(),
        resolvedAt: null,
      })
      .returning();
    return toIso(flag);
  });
}

export async function resolveFlag(
  db: Database,
  userId: string,
  id: string,
  resolvedAt: string | null,
): Promise<ConceptFlag | undefined> {
  const [flag] = await db
    .update(s.conceptFlags)
    .set({ resolvedAt })
    .where(and(eq(s.conceptFlags.id, id), eq(s.conceptFlags.userId, userId)))
    .returning();
  return flag ? toIso(flag) : undefined;
}
