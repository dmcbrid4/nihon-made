import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/db/schema.ts";
import { seedContent } from "../src/db/seed-content.ts";
import { concepts } from "../src/lib/study/content.ts";

if (!process.env.DATABASE_URL)
  throw new Error("Set DATABASE_URL in .env.local first.");

const client = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
try {
  const db = drizzle(client, { schema });
  await seedContent(db);
  console.log(`Seeded ${concepts.length} concepts. Existing users and reviews were preserved.`);
} finally {
  await client.end();
}
