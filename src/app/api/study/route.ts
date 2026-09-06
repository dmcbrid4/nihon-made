import { NextResponse, type NextRequest } from "next/server";
import { getDatabase } from "@/db/client";
import { PostgresRepository } from "@/db/repository";
import { actionSchema } from "@/lib/study/types";
import { authenticate } from "@/lib/server/supabase";
import { isSameOrigin, noStore, readJson } from "@/lib/server/requests";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await authenticate();
  if (auth.status !== 200) return NextResponse.json({ error: "Sign in to load your study history." }, { status: auth.status, headers: noStore });
  if (!process.env.DATABASE_URL)
    return NextResponse.json(
      { error: "Database mode is not configured." },
      { status: 404, headers: noStore },
    );
  try {
    return NextResponse.json(
      await new PostgresRepository(getDatabase(), auth.userId).load(),
      { headers: noStore },
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "Couldn’t load your study history. Check the database connection and run migrations and seeds.",
      },
      { status: 503, headers: noStore },
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticate();
  if (auth.status !== 200) return NextResponse.json({ error: "Sign in to save your progress." }, { status: auth.status, headers: noStore });
  if (!process.env.DATABASE_URL)
    return NextResponse.json(
      { error: "Database mode is not configured." },
      { status: 404, headers: noStore },
    );
  if (!isSameOrigin(request)) {
    return NextResponse.json(
      { error: "Request origin is not allowed." },
      { status: 403, headers: noStore },
    );
  }
  let input: unknown;
  try {
    input = await readJson(request);
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON." },
      { status: 400, headers: noStore },
    );
  }
  const action = actionSchema.safeParse(input);
  if (!action.success)
    return NextResponse.json(
      { error: "Check the submitted study details." },
      { status: 400, headers: noStore },
    );
  try {
    return NextResponse.json(
      await new PostgresRepository(getDatabase(), auth.userId).dispatch(action.data),
      { headers: noStore },
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "Your change couldn’t be saved. Reload to check your latest progress, then try again.",
      },
      { status: 409, headers: noStore },
    );
  }
}
