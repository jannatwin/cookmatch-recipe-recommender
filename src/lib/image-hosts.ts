// Hosts whose recipe photos Next.js may resize and cache (next.config.ts `images.remotePatterns`).
// Any other https image URL (e.g. one an admin pastes) is shown as-is, without optimisation.
export const OPTIMIZED_IMAGE_HOSTS = [
  "thumb.wikimedia.org",
  "upload.wikimedia.org",
  "img.spoonacular.com",
  "spoonacular.com",
  "www.themealdb.com",
] as const;

export function isOptimizedImageUrl(src: string) {
  try {
    const url = new URL(src);
    return url.protocol === "https:" && (OPTIMIZED_IMAGE_HOSTS as readonly string[]).includes(url.hostname);
  } catch {
    return false;
  }
}
