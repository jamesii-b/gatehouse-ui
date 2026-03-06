/**
 * Date/time formatting utilities.
 *
 * All timestamps from the API are stored in UTC (ISO 8601, e.g.
 * "2026-03-06T14:30:00Z" or "2026-03-06T14:30:00.000Z").  This module
 * provides helpers that always parse those strings as UTC and then render
 * them in the *user's local timezone* as reported by the browser.
 *
 * Usage
 * -----
 *   import { formatDateTime, formatDate, formatRelative } from "@/lib/date";
 *
 *   formatDateTime("2026-03-06T14:30:00Z")
 *   // → "Mar 6, 2026, 2:30:00 PM"  (user's local tz)
 *
 *   formatDate("2026-03-06T14:30:00Z")
 *   // → "Mar 6, 2026"
 *
 *   formatRelative("2026-03-06T14:30:00Z")
 *   // → "5 minutes ago"  (via Intl.RelativeTimeFormat)
 */

/**
 * Ensure the raw API string is treated as UTC.
 * The backend BaseModel serialises with a trailing "Z", but we handle
 * the "+00:00" form and bare ISO strings (YYYY-MM-DDTHH:MM:SS) too.
 */
function toUtcDate(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  // Already ends with Z or has an offset → parse directly
  if (raw.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(raw)) {
    return new Date(raw);
  }
  // Bare ISO string without timezone → treat as UTC
  return new Date(raw + "Z");
}

/**
 * Format a UTC timestamp as a human-readable date + time in the user's
 * local timezone.
 *
 * @param raw  - ISO 8601 UTC string from the API
 * @param opts - Optional Intl.DateTimeFormatOptions overrides
 */
export function formatDateTime(
  raw: string | null | undefined,
  opts?: Intl.DateTimeFormatOptions
): string {
  const d = toUtcDate(raw);
  if (!d || isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    ...opts,
  }).format(d);
}

/**
 * Format a UTC timestamp as a date-only string in the user's local timezone.
 */
export function formatDate(
  raw: string | null | undefined,
  opts?: Intl.DateTimeFormatOptions
): string {
  const d = toUtcDate(raw);
  if (!d || isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...opts,
  }).format(d);
}

/**
 * Format a UTC timestamp as a concise time-ago string.
 * Falls back to formatDateTime for dates older than 30 days.
 */
export function formatRelative(raw: string | null | undefined): string {
  const d = toUtcDate(raw);
  if (!d || isNaN(d.getTime())) return "—";

  const diffMs = d.getTime() - Date.now();
  const diffSec = Math.round(diffMs / 1000);
  const absSec = Math.abs(diffSec);

  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

  if (absSec < 60) return rtf.format(diffSec, "second");
  if (absSec < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (absSec < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  if (absSec < 86400 * 30) return rtf.format(Math.round(diffSec / 86400), "day");

  return formatDateTime(raw);
}

/**
 * Return a Date object for a UTC ISO string (or null on invalid input).
 * Useful when you need to compare timestamps.
 */
export function parseUtcDate(raw: string | null | undefined): Date | null {
  return toUtcDate(raw);
}
