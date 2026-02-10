/** Number of hours to look back for emails (matches cron interval) */
const LOOKBACK_HOURS = 2;

/**
 * Builds Gmail query for filtering unread emails.
 * Process inbox only; skip spam, promotions, social.
 * Only emails from the last 2 hours (uses epoch timestamp for precise time filter).
 */
export function buildGmailQuery(): string {
  const sinceEpoch = Math.floor(
    (Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000) / 1000
  );
  const base = `is:unread -in:spam -in:promotions -in:social after:${sinceEpoch}`;
  const labelFilter = process.env.LABEL_FILTER;
  if (labelFilter) {
    return `${base} label:${labelFilter}`;
  }
  return base;
}

/** Skip emails with very short bodies */
export const MIN_BODY_LENGTH = 50;
