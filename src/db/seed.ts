import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { seedContent } from "./seed-content";

async function main() {
  if (!process.env.DATABASE_URL)
    throw new Error("Set DATABASE_URL in .env.local first.");
  const client = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
  try {
    const db = drizzle(client, { schema });
    await seedContent(db);
    console.log(
      "Seeded 19 concepts. Existing users and reviews were preserved.",
    );
  } finally {
    await client.end();
  }
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Seed failed");
  process.exitCode = 1;
});
