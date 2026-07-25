/**
 * Short-lived cache for the per-request tenant/user status check.
 *
 * Middleware runs on every authenticated page and API request. It used to call
 * /api/internal/tenant-status over HTTP on each one, which meant an extra
 * function invocation plus two Postgres round-trips per request. A single
 * dashboard page load fans out to dozens of requests, so at 20+ tenants this is
 * the first thing that exhausts the connection pool.
 *
 * The cache is per-isolate and in-memory: it collapses the burst of requests
 * that make up one page load, which is where nearly all the duplication is. It
 * is deliberately not a correctness boundary — a freeze or a deactivation takes
 * effect within TTL_MS rather than instantly, and the authoritative checks still
 * live in the API routes.
 */

export type TenantStatus = {
  frozen: boolean;
  userActive: boolean;
  /** Current server-side session epoch for the user; see AppUser.sessionEpoch. */
  sessionEpoch: number;
};

const TTL_MS = Number(process.env.TENANT_STATUS_TTL_MS ?? 30_000);

// Bounded so a long-lived isolate cannot grow the map without limit.
const MAX_ENTRIES = 5_000;

type Entry = { value: TenantStatus; expiresAt: number };

const cache = new Map<string, Entry>();

function prune(now: number) {
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now) cache.delete(key);
  }
  if (cache.size <= MAX_ENTRIES) return;
  // Map preserves insertion order, so the oldest keys come first.
  const excess = cache.size - MAX_ENTRIES;
  let removed = 0;
  for (const key of cache.keys()) {
    cache.delete(key);
    if (++removed >= excess) break;
  }
}

export function getCachedTenantStatus(key: string): TenantStatus | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

export function setCachedTenantStatus(key: string, value: TenantStatus) {
  const now = Date.now();
  prune(now);
  cache.set(key, { value, expiresAt: now + TTL_MS });
}

/** Lets the freeze/deactivate paths drop a stale entry instead of waiting out the TTL. */
export function invalidateTenantStatus(key: string) {
  cache.delete(key);
}
