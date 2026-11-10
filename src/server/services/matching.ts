// CookMatch matching rules (SRS FR-9, FR-11, FR-13; implementation.md section 7).
// Pure and import-free so the rules can change without touching UI, routes or providers.
// The stored catalog is ranked in SQL (get_recommendations), which applies the same rules.

export const EXPIRY_WARNING_DAYS = 3;

export function normalizeIngredientName(value: string) {
  return value.normalize("NFKC").trim().toLocaleLowerCase("en-US").replace(/\s+/g, " ");
}

/** Percentage of required ingredients the user has, to one decimal place. */
export function matchScore(haveCount: number, requiredCount: number) {
  return requiredCount > 0 ? Math.round((haveCount / requiredCount) * 1000) / 10 : 0;
}

export function isAlmostAchievable(missingCount: number) {
  return missingCount === 1 || missingCount === 2;
}

/** True when a YYYY-MM-DD expiry falls in [today, today + warning window] (UTC, like the database). */
export function isExpiringSoon(expiryDate: string | null, now = new Date()) {
  if (!expiryDate) return false;
  const today = now.toISOString().slice(0, 10);
  const limit = new Date(now.getTime() + EXPIRY_WARNING_DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return expiryDate >= today && expiryDate <= limit;
}
