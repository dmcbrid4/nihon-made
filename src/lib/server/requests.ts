import type { NextRequest } from "next/server";

export const noStore = { "Cache-Control": "private, no-store" };

export function isSameOrigin(request: NextRequest): boolean {
  try { const origin = request.headers.get("origin"); return !!origin && new URL(origin).host === request.headers.get("host"); }
  catch { return false; }
}

export async function readJson(request: Request, maxBytes = 4096): Promise<unknown> {
  if (!request.headers.get("content-type")?.includes("application/json")) throw new Error("Expected JSON.");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("A request body is required.");
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.length; if (size > maxBytes) { await reader.cancel(); throw new Error("Request is too large."); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return JSON.parse(new TextDecoder().decode(bytes));
  } finally { reader.releaseLock(); }
}
