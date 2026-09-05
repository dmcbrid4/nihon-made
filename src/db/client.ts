import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Database = ReturnType<typeof drizzle<typeof schema>>;
let database: Database | undefined;

export function getDatabase(): Database {
  if (!process.env.DATABASE_URL)
    throw new Error("DATABASE_URL is not configured.");
  // prepare:false also supports Supabase transaction poolers.
  database ??= drizzle(
    postgres(process.env.DATABASE_URL, {
      prepare: false,
      max: 3,
      connect_timeout: 10,
      idle_timeout: 20,
    }),
    { schema },
  );
  return database;
}
