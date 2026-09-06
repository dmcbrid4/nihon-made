import assert from "node:assert/strict";
import test from "node:test";
import {
  hasFreshReauthentication,
  REAUTH_INTERVAL_SECONDS,
} from "../src/lib/server/reauth";

test("reauthentication is required every seven days", () => {
  const now = Date.UTC(2026, 8, 6, 18, 0, 0);
  assert.equal(hasFreshReauthentication(String(now), now), true);
  assert.equal(
    hasFreshReauthentication(
      String(now - REAUTH_INTERVAL_SECONDS * 1000 + 1),
      now,
    ),
    true,
  );
  assert.equal(
    hasFreshReauthentication(String(now - REAUTH_INTERVAL_SECONDS * 1000), now),
    false,
  );
  assert.equal(hasFreshReauthentication(undefined, now), false);
  assert.equal(hasFreshReauthentication("not-a-time", now), false);
  assert.equal(hasFreshReauthentication(String(now + 1), now), false);
});
