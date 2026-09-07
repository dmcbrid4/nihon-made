import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAppConfig, isOwner } from "@/lib/server/config";
import { createSupabaseServerClient } from "@/lib/server/supabase";
import { isSameOrigin, noStore, readJson } from "@/lib/server/requests";

const bodySchema = z.union([
  z.object({ skip: z.literal(true) }),
  z.object({ password: z.string().min(8) }),
]);

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

  let input: z.infer<typeof bodySchema>;
  try {
    input = bodySchema.parse(await readJson(request));
  } catch {
    return NextResponse.json(
      { error: "Enter a password of at least 8 characters." },
      { status: 400, headers: noStore },
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isOwner(user))
    return NextResponse.json(
      { error: "You’re not signed in." },
      { status: 401, headers: noStore },
    );

  const { error } = await supabase.auth.updateUser({
    ...("password" in input ? { password: input.password } : {}),
    data: {
      password_prompt_shown: true,
      ...("password" in input ? { password_set: true } : {}),
    },
  });
  if (error)
    return NextResponse.json(
      { error: error.message || "Couldn’t set that password. Try a different one." },
      { status: 400, headers: noStore },
    );

  return NextResponse.json({ ok: true }, { headers: noStore });
}
