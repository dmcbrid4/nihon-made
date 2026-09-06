import { z } from "zod";

const cloudSchema = z.object({
  DATABASE_URL: z.string().regex(/^postgres(?:ql)?:\/\//),
  SUPABASE_URL: z.url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(10),
  OWNER_EMAIL: z.email(),
});

export type AppConfig =
  | { mode: "browser" }
  | { mode: "unavailable" }
  | { mode: "database"; databaseUrl: string; supabaseUrl: string; publishableKey: string; ownerEmail: string };

export function getAppConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const fields = ["DATABASE_URL", "SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY", "OWNER_EMAIL"];
  if (!fields.some((field) => env[field])) return { mode: env.NODE_ENV === "production" ? "unavailable" : "browser" };
  const result = cloudSchema.safeParse(env);
  if (!result.success) return { mode: "unavailable" };
  return { mode: "database", databaseUrl: result.data.DATABASE_URL, supabaseUrl: result.data.SUPABASE_URL, publishableKey: result.data.SUPABASE_PUBLISHABLE_KEY, ownerEmail: result.data.OWNER_EMAIL.trim().toLowerCase() };
}

export function isOwner(user: { id: string; email?: string; email_confirmed_at?: string; is_anonymous?: boolean } | null, ownerEmail: string): boolean {
  return !!user && z.uuid().safeParse(user.id).success && !user.is_anonymous && !!user.email_confirmed_at && user.email?.toLowerCase() === ownerEmail.toLowerCase();
}
