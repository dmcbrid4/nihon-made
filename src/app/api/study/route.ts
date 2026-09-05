import { NextResponse, type NextRequest } from "next/server";
import { getDatabase } from "@/db/client";
import { PostgresRepository } from "@/db/repository";
import { actionSchema } from "@/lib/study/types";
import { checkAccess } from "@/lib/server/access";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  const access = checkAccess(request.headers.get("authorization"));
  if (access !== 200)
    return NextResponse.json(
      { error: "Workspace access is required." },
      { status: access, headers },
    );
  if (!process.env.DATABASE_URL)
    return NextResponse.json(
      { error: "Database mode is not configured." },
      { status: 404, headers },
    );
  try {
    return NextResponse.json(
      await new PostgresRepository(getDatabase()).load(),
      { headers },
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "Couldn’t load your study history. Check the database connection and run migrations and seeds.",
      },
      { status: 503, headers },
    );
  }
}

export async function POST(request: NextRequest) {
  const access = checkAccess(request.headers.get("authorization"));
  if (access !== 200)
    return NextResponse.json(
      { error: "Workspace access is required." },
      { status: access, headers },
    );
  if (!process.env.DATABASE_URL)
    return NextResponse.json(
      { error: "Database mode is not configured." },
      { status: 404, headers },
    );
  const origin = request.headers.get("origin");
  let sameOrigin = false;
  try {
    sameOrigin =
      !!origin && new URL(origin).host === request.headers.get("host");
  } catch {
    /* Malformed origins are rejected below. */
  }
  if (!sameOrigin) {
    return NextResponse.json(
      { error: "Request origin is not allowed." },
      { status: 403, headers },
    );
  }
  let input: unknown;
  try {
    const body = await request.text();
    if (body.length > 4096)
      return NextResponse.json(
        { error: "Request is too large." },
        { status: 413, headers },
      );
    input = JSON.parse(body);
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON." },
      { status: 400, headers },
    );
  }
  const action = actionSchema.safeParse(input);
  if (!action.success)
    return NextResponse.json(
      { error: "Check the submitted study details." },
      { status: 400, headers },
    );
  try {
    return NextResponse.json(
      await new PostgresRepository(getDatabase()).dispatch(action.data),
      { headers },
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "Your change couldn’t be saved. Reload to check your latest progress, then try again.",
      },
      { status: 409, headers },
    );
  }
}
