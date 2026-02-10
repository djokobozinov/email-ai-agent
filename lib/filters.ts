/**
 * Builds Gmail query for filtering unread emails.
 * Process inbox only; skip spam, promotions, social.
 */
export function buildGmailQuery(): string {
  const base =
    "is:unread -in:spam -in:promotions -in:social";
  const labelFilter = process.env.LABEL_FILTER;
  if (labelFilter) {
    return `${base} label:${labelFilter}`;
  }
  return base;
}

/** Skip emails with very short bodies */
export const MIN_BODY_LENGTH = 50;
