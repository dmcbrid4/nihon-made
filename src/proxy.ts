import { NextResponse, type NextRequest } from "next/server";
import { checkAccess } from "@/lib/server/access";

export function proxy(request: NextRequest) {
  const access = checkAccess(request.headers.get("authorization"));
  if (access === 503) {
    return new NextResponse(
      "Set APP_PASSWORD before using database mode in production.",
      { status: 503 },
    );
  }
  if (access === 200) return NextResponse.next();
  return new NextResponse("Sign in to Nihon Made.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Nihon Made", charset="UTF-8"',
      "Cache-Control": "no-store",
    },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|icon.svg).*)"],
};
