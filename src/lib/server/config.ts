import { z } from "zod";

const cloudSchema = z.object({
  DATABASE_URL: z.string().regex(/^postgres(?:ql)?:\/\//),
  SUPABASE_URL: z.url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(10),
  OWNER_EMAIL: z.email(),
  // Comma-separated additional allowed emails, alongside OWNER_EMAIL -- e.g.
  // for family members sharing this deployment. Each still needs a real
  // Supabase Auth user created for them (this app never self-serve signs up).
  OWNER_EMAILS: z.string().optional(),
});

export type AppConfig =
  | { mode: "browser" }
  | { mode: "unavailable" }
  | { mode: "database"; databaseUrl: string; supabaseUrl: string; publishableKey: string; ownerEmails: string[] };

export function getAppConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const fields = ["DATABASE_URL", "SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY", "OWNER_EMAIL"];
  if (!fields.some((field) => env[field])) return { mode: env.NODE_ENV === "production" ? "unavailable" : "browser" };
  const result = cloudSchema.safeParse(env);
  if (!result.success) return { mode: "unavailable" };
  const ownerEmails = [
    ...new Set(
      [result.data.OWNER_EMAIL, ...(result.data.OWNER_EMAILS?.split(",") ?? [])]
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
  return { mode: "database", databaseUrl: result.data.DATABASE_URL, supabaseUrl: result.data.SUPABASE_URL, publishableKey: result.data.SUPABASE_PUBLISHABLE_KEY, ownerEmails };
}

export function isOwner(user: { id: string; email?: string; email_confirmed_at?: string; is_anonymous?: boolean } | null, ownerEmails: string[]): boolean {
  return !!user && z.uuid().safeParse(user.id).success && !user.is_anonymous && !!user.email_confirmed_at && !!user.email && ownerEmails.includes(user.email.toLowerCase());
}
