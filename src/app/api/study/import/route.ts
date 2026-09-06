import { NextResponse, type NextRequest } from "next/server";
import { getDatabase } from "@/db/client";
import {
  ImportConflictError,
  ImportValidationError,
  PostgresRepository,
} from "@/db/repository";
import { authenticate } from "@/lib/server/supabase";
import { isSameOrigin, noStore, readJson } from "@/lib/server/requests";
import { stateSchema } from "@/lib/study/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await authenticate();
  if (auth.status !== 200)
    return NextResponse.json(
      { error: "Sign in to import your study history." },
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
    input = await readJson(request, 512 * 1024);
  } catch {
    return NextResponse.json(
      { error: "Invalid or oversized JSON." },
      { status: 400, headers: noStore },
    );
  }
  const parsed = stateSchema.safeParse(input);
  if (!parsed.success)
    return NextResponse.json(
      { error: "That study history is not valid." },
      { status: 400, headers: noStore },
    );
  try {
    const state = await new PostgresRepository(
      getDatabase(),
      auth.userId,
    ).importState(parsed.data);
    return NextResponse.json(state, { headers: noStore });
  } catch (error) {
    if (error instanceof ImportConflictError)
      return NextResponse.json(
        { error: "Cloud history already contains study activity. Nothing was changed." },
        { status: 409, headers: noStore },
      );
    if (error instanceof ImportValidationError)
      return NextResponse.json(
        { error: error.message },
        { status: 400, headers: noStore },
      );
    return NextResponse.json(
      { error: "Your history could not be imported. Check the database setup and try again." },
      { status: 503, headers: noStore },
    );
  }
}
