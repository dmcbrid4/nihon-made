const DAY_MS = 86_400_000;

export function dateInZone(now: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function daysUntil(
  targetDate: string,
  now: Date,
  timeZone: string,
): number {
  return Math.max(
    0,
    Math.round(
      (Date.parse(targetDate) - Date.parse(dateInZone(now, timeZone))) / DAY_MS,
    ),
  );
}

export function formatTripDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}
