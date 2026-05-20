import {
  EMAIL_LOOKBACK_MINUTES,
  MIN_EMAIL_BODY_LENGTH,
  getCommaSeparatedConfig,
  getConfiguredValue,
} from "./config";

/**
 * Builds Gmail query for filtering unread emails.
 * Process inbox, social, promotions; skip spam only.
 * Only emails from the last 30 minutes (uses epoch timestamp for precise time filter).
 *
 * Env vars:
 * - LABEL_FILTER: restrict to a single label (e.g. IMPORTANT)
 * - EXCLUDE_CATEGORIES: comma-separated categories to skip (e.g. promotions, social)
 */
export function buildGmailQuery(): string {
  const sinceEpoch = Math.floor(
    (Date.now() - EMAIL_LOOKBACK_MINUTES * 60 * 1000) / 1000
  );
  const base = `is:unread -in:spam after:${sinceEpoch}`;
  let query = base;

  const categories = getCommaSeparatedConfig("EXCLUDE_CATEGORIES").map((c) =>
    c.toLowerCase()
  );
  if (categories.length > 0) {
    for (const cat of categories) {
      query += ` -category:${cat}`;
    }
  }

  const labelFilter = getConfiguredValue("LABEL_FILTER");
  if (labelFilter) {
    query += ` label:${labelFilter}`;
  }
  return query;
}

/** Skip emails with very short bodies */
export const MIN_BODY_LENGTH = MIN_EMAIL_BODY_LENGTH;
