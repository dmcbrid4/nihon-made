import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAppConfig } from "@/lib/server/config";
import { createSupabaseServerClient } from "@/lib/server/supabase";
import { isSameOrigin, noStore, readJson } from "@/lib/server/requests";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403, headers: noStore });
  const config = getAppConfig();
  if (config.mode !== "database") return NextResponse.json({ error: "Cloud sign-in is not configured." }, { status: 503, headers: noStore });
  let input;
  try { input = z.object({ email: z.email().transform((email) => email.toLowerCase()) }).parse(await readJson(request)); }
  catch { return NextResponse.json({ error: "Enter a valid email address." }, { status: 400, headers: noStore }); }
  if (input.email !== config.ownerEmail) return NextResponse.json({ error: "Use the email address for this private workspace." }, { status: 403, headers: noStore });
  try {
    const { error } = await (await createSupabaseServerClient()).auth.signInWithOtp({ email: input.email, options: { shouldCreateUser: false } });
    if (error) return NextResponse.json({ error: error.status === 429 ? "Please wait a minute before requesting another code." : "Couldn’t send a sign-in code. Please try again." }, { status: error.status === 429 ? 429 : 503, headers: noStore });
    return NextResponse.json({ ok: true }, { headers: noStore });
  } catch { return NextResponse.json({ error: "Sign-in is temporarily unavailable." }, { status: 503, headers: noStore }); }
}
