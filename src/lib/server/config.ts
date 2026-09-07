import { z } from "zod";

const cloudSchema = z.object({
  DATABASE_URL: z.string().regex(/^postgres(?:ql)?:\/\//),
  SUPABASE_URL: z.url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(10),
  OWNER_EMAIL: z.email(),
  // Comma-separated additional allowed emails, alongside OWNER_EMAIL -- e.g.
  // for family members sharing this deployment.
  OWNER_EMAILS: z.string().optional(),
  // A shared secret that lets anyone who knows it create their own account
  // (see canRequestAccess/auth/code), instead of pre-listing every email.
  INVITE_PASSWORD: z.string().min(1).optional(),
});

export type AppConfig =
  | { mode: "browser" }
  | { mode: "unavailable" }
  | {
      mode: "database";
      databaseUrl: string;
      supabaseUrl: string;
      publishableKey: string;
      ownerEmails: string[];
      invitePassword: string | null;
    };

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
  return {
    mode: "database",
    databaseUrl: result.data.DATABASE_URL,
    supabaseUrl: result.data.SUPABASE_URL,
    publishableKey: result.data.SUPABASE_PUBLISHABLE_KEY,
    ownerEmails,
    invitePassword: result.data.INVITE_PASSWORD ?? null,
  };
}

/** Whether a Supabase Auth session is legitimate for this app. Deliberately
 * does not check a specific email list: account *creation* is already gated
 * (see canRequestAccess), so any real, confirmed, non-anonymous account that
 * exists in this project's Supabase Auth was already vetted at sign-up. */
export function isOwner(user: { id: string; email?: string; email_confirmed_at?: string; is_anonymous?: boolean } | null): boolean {
  return !!user && z.uuid().safeParse(user.id).success && !user.is_anonymous && !!user.email_confirmed_at && !!user.email;
}

/** Gate for creating/using a new sign-in: either a pre-approved email, or
 * anyone who supplies the shared invite password. */
export function canRequestAccess(
  config: { ownerEmails: string[]; invitePassword: string | null },
  email: string,
  invitePassword?: string,
): boolean {
  return (
    config.ownerEmails.includes(email) ||
    (!!config.invitePassword && invitePassword === config.invitePassword)
  );
}
