import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/server/supabase";
import { REAUTH_COOKIE } from "@/lib/server/reauth";
import { isSameOrigin, noStore } from "@/lib/server/requests";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request))
    return NextResponse.json(
      { error: "Request origin is not allowed." },
      { status: 403, headers: noStore },
    );
  try {
    await (await createSupabaseServerClient()).auth.signOut({ scope: "local" });
    const response = NextResponse.json({ ok: true }, { headers: noStore });
    response.cookies.set(REAUTH_COOKIE, "", { maxAge: 0, path: "/" });
    return response;
  } catch {
    return NextResponse.json(
      { error: "Couldn’t sign out. Please try again." },
      { status: 503, headers: noStore },
    );
  }
}
