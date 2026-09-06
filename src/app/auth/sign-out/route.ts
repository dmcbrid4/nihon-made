import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/server/supabase";
import { isSameOrigin, noStore } from "@/lib/server/requests";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403, headers: noStore });
  try { await (await createSupabaseServerClient()).auth.signOut({ scope: "local" }); return NextResponse.json({ ok: true }, { headers: noStore }); }
  catch { return NextResponse.json({ error: "Couldn’t sign out. Please try again." }, { status: 503, headers: noStore }); }
}
