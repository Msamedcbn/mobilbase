import { NextResponse } from "next/server";

/**
 * In-process fixed-window rate limiting.
 *
 * SCOPE AND LIMITS — read before relying on this.
 * The counters live in the memory of one server instance. With several
 * instances (or serverless, where instances come and go) an attacker's requests
 * spread across them and the effective limit is roughly `limit × instances`.
 * That is still the difference between thousands of password guesses per minute
 * and a few dozen, which is the point: it raises the cost of online brute force
 * without adding infrastructure.
 *
 * If the platform needs a hard guarantee — and at 20+ paying tenants it will —
 * replace the store below with Redis/Upstash and keep this same interface. That
 * is the only part that has to change.
 */

export type RateLimitOptions = {
  /** Namespace, so /login and /trial-start do not share a counter. */
  bucket: string;
  /** Requests permitted per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
  /** Extra identity beyond the client IP (e.g. the submitted email). */
  key?: string;
};

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();

// Bounded so a flood of distinct keys cannot grow the map indefinitely.
const MAX_KEYS = 10_000;

function sweep(now: number) {
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
  if (windows.size <= MAX_KEYS) return;
  const excess = windows.size - MAX_KEYS;
  let removed = 0;
  for (const key of windows.keys()) {
    windows.delete(key);
    if (++removed >= excess) break;
  }
}

/**
 * Best-effort client identity.
 *
 * x-forwarded-for is client-controlled unless a trusted proxy overwrites it.
 * Vercel and most managed hosts do overwrite it, so the leftmost entry is
 * meaningful there; behind a bare reverse proxy it is not. Treat this as a
 * throttle key, never as authentication.
 */
export function getClientIdentifier(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function checkRateLimit(req: Request, options: RateLimitOptions): Promise<RateLimitResult> {
  const now = Date.now();
  sweep(now);

  const identifier = `${options.bucket}:${getClientIdentifier(req)}:${options.key ?? ""}`;
  const existing = windows.get(identifier);

  if (!existing || existing.resetAt <= now) {
    windows.set(identifier, { count: 1, resetAt: now + options.windowMs });
    return { ok: true, remaining: options.limit - 1, retryAfterSeconds: 0 };
  }

  existing.count += 1;
  if (existing.count > options.limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  return { ok: true, remaining: options.limit - existing.count, retryAfterSeconds: 0 };
}

export function rateLimitResponse(result: RateLimitResult) {
  return NextResponse.json(
    { error: "Cok fazla istek gonderildi. Lutfen biraz bekleyip tekrar deneyin." },
    {
      status: 429,
      headers: { "retry-after": String(result.retryAfterSeconds) },
    },
  );
}

/** Lets a successful login discard the failure counter for that identity. */
export function resetRateLimit(req: Request, options: Pick<RateLimitOptions, "bucket" | "key">) {
  windows.delete(`${options.bucket}:${getClientIdentifier(req)}:${options.key ?? ""}`);
}
