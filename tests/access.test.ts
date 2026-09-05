import assert from "node:assert/strict";
import test from "node:test";
import { checkAccess } from "../src/lib/server/access";

test("database access fails closed in production and verifies the personal password", (context) => {
  const originalEnvironment = process.env;
  process.env = {
    ...originalEnvironment,
    NODE_ENV: "production",
    DATABASE_URL: "postgres://example.invalid/nihon",
    APP_PASSWORD: "",
  };
  context.after(() => {
    process.env = originalEnvironment;
  });
  assert.equal(checkAccess(null), 503);
  process.env.APP_PASSWORD = "test-password";
  assert.equal(checkAccess(null), 401);
  assert.equal(
    checkAccess(`Basic ${Buffer.from("nihon:wrong").toString("base64")}`),
    401,
  );
  assert.equal(
    checkAccess(
      `Basic ${Buffer.from("nihon:test-password").toString("base64")}`,
    ),
    200,
  );
});
