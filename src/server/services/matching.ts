// CookMatch matching rules (SRS FR-9, FR-11, FR-13; docs/implementation.md section 7).
// Pure and import-free so the rules can change without touching UI, routes or providers.
// The stored catalog is ranked in SQL (get_recommendations), which applies the same rules.

export const EXPIRY_WARNING_DAYS = 3;

export function normalizeIngredientName(value: string) {
  return value.normalize("NFKC").trim().toLocaleLowerCase("en-US").replace(/\s+/g, " ");
}

/** Pantry staples (salt, oil, pepper, water) count this much of a normal ingredient. Same value as in SQL. */
export const STAPLE_WEIGHT = 0.25;

/**
 * Weighted percentage of required ingredients the user has, to one decimal place.
 * Counts include staples; pass how many of each are staples so they can be weighted down.
 */
export function matchScore(haveCount: number, requiredCount: number, haveStaples = 0, requiredStaples = 0) {
  const weigh = (count: number, staples: number) => count - staples + staples * STAPLE_WEIGHT;
  const required = weigh(requiredCount, requiredStaples);
  return required > 0 ? Math.round((weigh(haveCount, haveStaples) / required) * 1000) / 10 : 0;
}

export function isAlmostAchievable(missingCount: number) {
  return missingCount === 1 || missingCount === 2;
}

/** True when a YYYY-MM-DD expiry falls in [today, today + warning window] (UTC, like the database). */
export function isExpiringSoon(expiryDate: string | null, now = new Date()) {
  if (!expiryDate) return false;
  const today = now.toISOString().slice(0, 10);
  const limit = new Date(now.getTime() + EXPIRY_WARNING_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  return expiryDate >= today && expiryDate <= limit;
}
