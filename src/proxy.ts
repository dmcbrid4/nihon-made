import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getAppConfig, isOwner } from "@/lib/server/config";
import { hasFreshReauthentication, REAUTH_COOKIE } from "@/lib/server/reauth";

export async function proxy(request: NextRequest) {
  const config = getAppConfig();
  if (config.mode === "browser") return NextResponse.next();
  if (config.mode === "unavailable")
    return new NextResponse(
      "Cloud setup is incomplete. Configure Supabase and OWNER_EMAIL before using this deployment.",
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  let response = NextResponse.next({ request });
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
        setAll: (values) => {
          values.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          values.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );
  const path = request.nextUrl.pathname;
  if (path.startsWith("/auth/") || path.startsWith("/api/") || path === "/guest") return response;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (
    path !== "/sign-in" &&
    (!isOwner(user, config.ownerEmail) ||
      !hasFreshReauthentication(request.cookies.get(REAUTH_COOKIE)?.value))
  )
    return NextResponse.redirect(new URL("/sign-in", request.url));
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|icon.svg).*)"],
};
