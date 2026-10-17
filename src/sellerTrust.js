// One place for what "trusted seller" means, so the marketplace cards and
// the profile never disagree. Earned by reputation, not bought: at least
// three reviews and a 4.5 average or better.
export const TRUSTED_MIN_REVIEWS = 3
export const TRUSTED_MIN_RATING = 4.5

export function isTrustedSeller(rating, reviewCount) {
  return Number(reviewCount) >= TRUSTED_MIN_REVIEWS && Number(rating) >= TRUSTED_MIN_RATING
}