import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAppConfig } from "@/lib/server/config";
import { isSameOrigin, noStore, readJson } from "@/lib/server/requests";

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
  let input;
  try {
    input = z
      .object({ email: z.email().transform((email) => email.toLowerCase()) })
      .parse(await readJson(request));
  } catch {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400, headers: noStore },
    );
  }
  if (input.email !== config.ownerEmail)
    return NextResponse.json(
      { error: "Use the email address for this private workspace." },
      { status: 403, headers: noStore },
    );
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

  try {
    const emailRedirectTo = new URL("/auth/callback", request.url).toString();
    const { error } = await supabase.auth.signInWithOtp({
      email: input.email,
      options: { shouldCreateUser: false, emailRedirectTo },
    });
    if (error)
      return NextResponse.json(
        {
          error:
            error.status === 429
              ? "Please wait a minute before requesting another link."
              : "Couldn’t send a sign-in link. Please try again.",
        },
        {
          status: error.status === 429 ? 429 : 503,
          headers: noStore,
        },
      );
    return response;
  } catch {
    return NextResponse.json(
      { error: "Sign-in is temporarily unavailable." },
      { status: 503, headers: noStore },
    );
  }
}
