/**
 * Shared cache policy for marketplace price lookups.
 * TTL is based on aggregate product demand, never on an individual customer.
 */
export type CacheTier = 'popular' | 'regular' | 'inactive';

export interface CachePolicy {
  tier: CacheTier;
  ttlSeconds: number;
  refreshCooldownSeconds: number;
}

export function getCachePolicy(searchesLast24Hours: number): CachePolicy {
  const searches = Math.max(0, Math.floor(Number.isFinite(searchesLast24Hours) ? searchesLast24Hours : 0));
  if (searches >= 50) return { tier: 'popular', ttlSeconds: 1800, refreshCooldownSeconds: 900 };
  if (searches >= 5) return { tier: 'regular', ttlSeconds: 21600, refreshCooldownSeconds: 900 };
  return { tier: 'inactive', ttlSeconds: 86400, refreshCooldownSeconds: 900 };
}

export function isCacheFresh(fetchedAt: string | Date, ttlSeconds: number, now = Date.now()): boolean {
  const fetchedAtMs = fetchedAt instanceof Date ? fetchedAt.getTime() : Date.parse(fetchedAt);
  if (!Number.isFinite(fetchedAtMs) || !Number.isFinite(ttlSeconds) || ttlSeconds < 0) return false;
  return now < fetchedAtMs + ttlSeconds * 1000;
}

export function getCacheAgeLabel(fetchedAt: string | Date, now = Date.now()): string {
  const fetchedAtMs = fetchedAt instanceof Date ? fetchedAt.getTime() : Date.parse(fetchedAt);
  if (!Number.isFinite(fetchedAtMs)) return 'Last checked time unavailable';
  const ageMinutes = Math.max(0, Math.floor((now - fetchedAtMs) / 60000));
  if (ageMinutes < 1) return 'Checked just now';
  if (ageMinutes < 60) return `Checked ${ageMinutes} min ago`;
  const ageHours = Math.floor(ageMinutes / 60);
  if (ageHours < 24) return `Checked ${ageHours} hr ago`;
  const ageDays = Math.floor(ageHours / 24);
  return `Checked ${ageDays} day${ageDays === 1 ? '' : 's'} ago`;
}
