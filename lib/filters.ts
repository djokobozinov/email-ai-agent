/** Number of minutes to look back for emails (matches cron interval) */
const LOOKBACK_MINUTES = 30;

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
    (Date.now() - LOOKBACK_MINUTES * 60 * 1000) / 1000
  );
  const base = `is:unread -in:spam after:${sinceEpoch}`;
  let query = base;

  const excludeCategories = process.env.EXCLUDE_CATEGORIES?.trim();
  if (excludeCategories) {
    const categories = excludeCategories
      .split(",")
      .map((c) => c.trim().toLowerCase())
      .filter(Boolean);
    for (const cat of categories) {
      query += ` -category:${cat}`;
    }
  }

  const labelFilter = process.env.LABEL_FILTER;
  if (labelFilter) {
    query += ` label:${labelFilter}`;
  }
  return query;
}

/** Skip emails with very short bodies */
export const MIN_BODY_LENGTH = 5;
