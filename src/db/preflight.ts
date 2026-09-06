import postgres from "postgres";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl)
    throw new Error("Set DATABASE_URL in .env.local first.");
  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL connection URL.");
  }
  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:")
    throw new Error("DATABASE_URL must use the postgres:// or postgresql:// scheme.");

  const client = postgres(databaseUrl, {
    prepare: false,
    max: 1,
    connect_timeout: 10,
  });
  try {
    const [connection] = await client<
      { database: string; role: string; schema: string }[]
    >`select current_database() as database, current_user as role, current_schema() as schema`;
    if (!connection) throw new Error("The database did not return connection details.");
    console.log(
      `Connected to database ${connection.database} as ${connection.role} in schema ${connection.schema}.`,
    );
  } finally {
    await client.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Database preflight failed.");
  process.exitCode = 1;
});
