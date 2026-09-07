import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAppConfig, isOwner } from "@/lib/server/config";
import { REAUTH_COOKIE, REAUTH_INTERVAL_SECONDS } from "@/lib/server/reauth";
import { isSameOrigin, noStore, readJson } from "@/lib/server/requests";

const credentialsSchema = z.object({
  email: z.email().transform((email) => email.toLowerCase()),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request))
    return NextResponse.json(
      { error: "Request origin is not allowed." },
      { status: 403, headers: noStore },
    );

  const config = getAppConfig();
  if (config.mode !== "database")
    return NextResponse.json(
      { error: "Cloud sign-in is not configured." },
      { status: 503, headers: noStore },
    );

  let input: z.infer<typeof credentialsSchema>;
  try {
    input = credentialsSchema.parse(await readJson(request));
  } catch {
    return NextResponse.json(
      { error: "Enter your email address and password." },
      { status: 400, headers: noStore },
    );
  }

  const response = NextResponse.json({ ok: true }, { headers: noStore });
  const supabase = createServerClient(
    config.supabaseUrl,
    config.publishableKey,
    {
      cookieOptions: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      },
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (values) =>
          values.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          ),
      },
    },
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.signInWithPassword(input);
  if (error || !isOwner(user)) {
    if (user) await supabase.auth.signOut({ scope: "local" });
    return NextResponse.json(
      { error: "That email address or password is not correct." },
      { status: 401, headers: noStore },
    );
  }

  response.cookies.set(REAUTH_COOKIE, String(Date.now()), {
    httpOnly: true,
    maxAge: REAUTH_INTERVAL_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
