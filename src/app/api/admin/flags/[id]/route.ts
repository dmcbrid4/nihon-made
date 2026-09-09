import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/db/client";
import { resolveFlag } from "@/db/flags";
import { authenticate } from "@/lib/server/supabase";
import { isSameOrigin, noStore, readJson } from "@/lib/server/requests";

export const dynamic = "force-dynamic";

const patchSchema = z.object({ resolvedAt: z.iso.datetime().nullable() });

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticate();
  if (auth.status !== 200)
    return NextResponse.json(
      { error: "Sign in to update a flag." },
      { status: auth.status, headers: noStore },
    );
  if (!process.env.DATABASE_URL)
    return NextResponse.json(
      { error: "Database mode is not configured." },
      { status: 404, headers: noStore },
    );
  if (!isSameOrigin(request))
    return NextResponse.json(
      { error: "Request origin is not allowed." },
      { status: 403, headers: noStore },
    );
  let input: unknown;
  try {
    input = await readJson(request);
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON." },
      { status: 400, headers: noStore },
    );
  }
  const parsed = patchSchema.safeParse(input);
  if (!parsed.success)
    return NextResponse.json(
      { error: "Check the flag update." },
      { status: 400, headers: noStore },
    );
  const { id } = await params;
  try {
    const flag = await resolveFlag(
      getDatabase(),
      auth.userId,
      id,
      parsed.data.resolvedAt,
    );
    if (!flag)
      return NextResponse.json(
        { error: "Flag not found." },
        { status: 404, headers: noStore },
      );
    return NextResponse.json(flag, { headers: noStore });
  } catch {
    return NextResponse.json(
      { error: "Couldn't update the flag." },
      { status: 503, headers: noStore },
    );
  }
}
