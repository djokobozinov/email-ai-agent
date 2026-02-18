/** Number of minutes to look back for emails (matches cron interval) */
const LOOKBACK_MINUTES = 30;

/**
 * Builds Gmail query for filtering unread emails.
 * Process inbox, social, promotions; skip spam only.
 * Only emails from the last 30 minutes (uses epoch timestamp for precise time filter).
 */
export function buildGmailQuery(): string {
  const sinceEpoch = Math.floor(
    (Date.now() - LOOKBACK_MINUTES * 60 * 1000) / 1000
  );
  const base = `is:unread -in:spam after:${sinceEpoch}`;
  const labelFilter = process.env.LABEL_FILTER;
  if (labelFilter) {
    return `${base} label:${labelFilter}`;
  }
  return base;
}

/** Skip emails with very short bodies */
export const MIN_BODY_LENGTH = 5;
