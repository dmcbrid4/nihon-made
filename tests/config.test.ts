import assert from "node:assert/strict";
import test from "node:test";
import { getAppConfig, isOwner } from "../src/lib/server/config";

const cloudEnv = {
  NODE_ENV: "development",
  DATABASE_URL: "postgres://example.invalid/nihon",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_1234567890",
  OWNER_EMAIL: "Owner@Example.com",
} satisfies NodeJS.ProcessEnv;

const owner = {
  id: "b3f6c9d2-1a2b-4c3d-8e9f-0a1b2c3d4e5f",
  email: "owner@example.com",
  email_confirmed_at: "2026-01-01T00:00:00Z",
  is_anonymous: false,
};

test("getAppConfig falls back to browser mode with no cloud env, unavailable in production", () => {
  assert.deepEqual(getAppConfig({ NODE_ENV: "development" }), { mode: "browser" });
  assert.deepEqual(getAppConfig({ NODE_ENV: "production" }), { mode: "unavailable" });
});

test("getAppConfig requires all four core fields once any is set", () => {
  const config = getAppConfig({ ...cloudEnv, SUPABASE_URL: "" });
  assert.deepEqual(config, { mode: "unavailable" });
});

test("a single OWNER_EMAIL still works exactly as before (backward compatible)", () => {
  const config = getAppConfig(cloudEnv);
  assert.equal(config.mode, "database");
  if (config.mode !== "database") return;
  assert.deepEqual(config.ownerEmails, ["owner@example.com"]);
  assert.equal(isOwner(owner, config.ownerEmails), true);
});

test("OWNER_EMAILS adds a third and fourth approved email, case-insensitively and deduplicated", () => {
  const config = getAppConfig({
    ...cloudEnv,
    OWNER_EMAILS: " Brother@Example.com, sister@example.com ,owner@example.com,",
  });
  assert.equal(config.mode, "database");
  if (config.mode !== "database") return;
  assert.deepEqual(config.ownerEmails, [
    "owner@example.com",
    "brother@example.com",
    "sister@example.com",
  ]);
  assert.equal(isOwner({ ...owner, email: "brother@example.com" }, config.ownerEmails), true);
  assert.equal(isOwner({ ...owner, email: "sister@example.com" }, config.ownerEmails), true);
  assert.equal(isOwner({ ...owner, email: "stranger@example.com" }, config.ownerEmails), false);
});

test("isOwner rejects unconfirmed, anonymous, non-UUID, or missing users", () => {
  const ownerEmails = ["owner@example.com"];
  assert.equal(isOwner(null, ownerEmails), false);
  assert.equal(isOwner({ ...owner, email_confirmed_at: undefined }, ownerEmails), false);
  assert.equal(isOwner({ ...owner, is_anonymous: true }, ownerEmails), false);
  assert.equal(isOwner({ ...owner, id: "not-a-uuid" }, ownerEmails), false);
  assert.equal(isOwner({ ...owner, email: undefined }, ownerEmails), false);
});
