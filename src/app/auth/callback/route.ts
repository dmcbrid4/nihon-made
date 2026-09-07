import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getAppConfig, isOwner } from "@/lib/server/config";
import { REAUTH_COOKIE, REAUTH_INTERVAL_SECONDS } from "@/lib/server/reauth";

function signInRedirect(request: NextRequest, reason: string) {
  const url = new URL("/sign-in", request.url);
  url.searchParams.set("error", reason);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const config = getAppConfig();
  if (config.mode !== "database")
    return signInRedirect(request, "Cloud sign-in is not configured.");
  const code = request.nextUrl.searchParams.get("code");
  if (!code)
    return signInRedirect(
      request,
      "That sign-in link is invalid or has expired.",
    );

  const response = NextResponse.redirect(new URL("/", request.url));
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

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error)
    return signInRedirect(
      request,
      "That sign-in link is invalid or has expired.",
    );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isOwner(user, config.ownerEmails)) {
    await supabase.auth.signOut();
    return signInRedirect(
      request,
      "This private workspace is not available for that account.",
    );
  }

  response.cookies.set(REAUTH_COOKIE, String(Date.now()), {
    httpOnly: true,
    maxAge: REAUTH_INTERVAL_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
