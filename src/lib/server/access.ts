import { createHash, timingSafeEqual } from "node:crypto";

export function checkAccess(authorization: string | null): 200 | 401 | 503 {
  const password = process.env.APP_PASSWORD;
  if (
    process.env.DATABASE_URL &&
    process.env.NODE_ENV === "production" &&
    !password
  )
    return 503;
  if (!password) return 200;
  if (authorization?.startsWith("Basic ")) {
    const supplied = Buffer.from(authorization.slice(6), "base64").toString();
    const hash = (value: string) => createHash("sha256").update(value).digest();
    if (timingSafeEqual(hash(supplied), hash(`nihon:${password}`))) return 200;
  }
  return 401;
}
