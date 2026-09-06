import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAppConfig, isOwner } from "@/lib/server/config";
import { createSupabaseServerClient } from "@/lib/server/supabase";
import { isSameOrigin, noStore, readJson } from "@/lib/server/requests";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403, headers: noStore });
  const config = getAppConfig();
  if (config.mode !== "database") return NextResponse.json({ error: "Cloud sign-in is not configured." }, { status: 503, headers: noStore });
  let input;
  try { input = z.object({ email: z.email().transform((email) => email.toLowerCase()), code: z.string().regex(/^\d{6,8}$/) }).parse(await readJson(request)); }
  catch { return NextResponse.json({ error: "Enter the code from your email." }, { status: 400, headers: noStore }); }
  if (input.email !== config.ownerEmail) return NextResponse.json({ error: "Use the email address for this private workspace." }, { status: 403, headers: noStore });
  try {
    const { data, error } = await (await createSupabaseServerClient()).auth.verifyOtp({ email: input.email, token: input.code, type: "email" });
    if (error || !isOwner(data.user, config.ownerEmail)) return NextResponse.json({ error: "That code is invalid or has expired. Request a new one." }, { status: 401, headers: noStore });
    return NextResponse.json({ ok: true }, { headers: noStore });
  } catch { return NextResponse.json({ error: "Sign-in is temporarily unavailable." }, { status: 503, headers: noStore }); }
}
