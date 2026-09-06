export const REAUTH_COOKIE = "nihon-made-reauth-at";
export const REAUTH_INTERVAL_SECONDS = 60 * 60 * 24 * 7;

export function hasFreshReauthentication(
  value: string | undefined,
  now = Date.now(),
) {
  if (!value || !/^\d+$/.test(value)) return false;
  const authenticatedAt = Number(value);
  return (
    Number.isSafeInteger(authenticatedAt) &&
    authenticatedAt <= now &&
    now - authenticatedAt < REAUTH_INTERVAL_SECONDS * 1000
  );
}
