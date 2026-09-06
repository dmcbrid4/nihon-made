import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getAppConfig, isOwner } from "./config";

export async function createSupabaseServerClient() {
  const config = getAppConfig();
  if (config.mode !== "database") throw new Error("Cloud storage is not configured.");
  const store = await cookies();
  return createServerClient(config.supabaseUrl, config.publishableKey, {
    cookieOptions: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" },
    cookies: {
      getAll: () => store.getAll(),
      setAll: (values) => { try { values.forEach(({ name, value, options }) => store.set(name, value, options)); } catch { /* Proxy refreshes cookies where server components cannot write them. */ } },
    },
  });
}

export async function authenticate(): Promise<{ userId: string; email: string; status: 200 } | { status: 401 | 403 | 503 }> {
  const config = getAppConfig();
  if (config.mode !== "database") return { status: 503 };
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return { status: 401 };
    if (!isOwner(user, config.ownerEmail)) return { status: 403 };
    return { status: 200, userId: user.id, email: user.email! };
  } catch { return { status: 503 }; }
}
