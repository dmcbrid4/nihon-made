import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/db/client";
import { createFlag, listFlags } from "@/db/flags";
import { authenticate } from "@/lib/server/supabase";
import { isSameOrigin, noStore, readJson } from "@/lib/server/requests";

export const dynamic = "force-dynamic";

const flagInputSchema = z.object({
  id: z.uuid(),
  conceptId: z.string().max(100),
  note: z.string().min(1).max(1000),
});

export async function GET() {
  const auth = await authenticate();
  if (auth.status !== 200)
    return NextResponse.json(
      { error: "Sign in to view flagged cards." },
      { status: auth.status, headers: noStore },
    );
  if (!process.env.DATABASE_URL)
    return NextResponse.json(
      { error: "Database mode is not configured." },
      { status: 404, headers: noStore },
    );
  try {
    return NextResponse.json(await listFlags(getDatabase(), auth.userId), {
      headers: noStore,
    });
  } catch {
    return NextResponse.json(
      { error: "Couldn't load flags. Check the database connection." },
      { status: 503, headers: noStore },
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticate();
  if (auth.status !== 200)
    return NextResponse.json(
      { error: "Sign in to flag a card." },
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
  const parsed = flagInputSchema.safeParse(input);
  if (!parsed.success)
    return NextResponse.json(
      { error: "Check the flag details." },
      { status: 400, headers: noStore },
    );
  try {
    return NextResponse.json(
      await createFlag(getDatabase(), auth.userId, parsed.data),
      { status: 201, headers: noStore },
    );
  } catch {
    return NextResponse.json(
      { error: "Couldn't save the flag. It may reference an unknown card." },
      { status: 400, headers: noStore },
    );
  }
}
