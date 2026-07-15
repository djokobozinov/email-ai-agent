import {
  EMAIL_LOOKBACK_MINUTES,
  MIN_EMAIL_BODY_LENGTH,
  getCommaSeparatedConfig,
  getConfiguredValue,
} from "./config";

/**
 * Builds a Gmail query for the configured lookback period.
 * Process inbox, social, promotions; skip spam only.
 * Uses an epoch timestamp for a precise time filter.
 *
 * Env vars:
 * - LABEL_FILTER: restrict to a single label (e.g. IMPORTANT)
 * - EXCLUDE_CATEGORIES: comma-separated categories to skip (e.g. promotions, social)
 */
export function buildGmailQuery(options: { includeRead?: boolean } = {}): string {
  const sinceEpoch = Math.floor(
    (Date.now() - EMAIL_LOOKBACK_MINUTES * 60 * 1000) / 1000
  );
  const unreadFilter = options.includeRead ? "" : "is:unread ";
  const base = `${unreadFilter}-in:spam after:${sinceEpoch}`;
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
