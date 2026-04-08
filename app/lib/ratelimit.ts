// Simple in-memory rate limiter + daily call cap.
// Good enough for an internal tool on a single server instance.

type Bucket = { count: number; resetAt: number };
const perMinute = new Map<string, Bucket>();
const perDay = new Map<string, Bucket>();

const PER_MINUTE_LIMIT = parseInt(process.env.RL_PER_MINUTE || "10", 10);
const PER_DAY_LIMIT = parseInt(process.env.RL_PER_DAY || "200", 10);

function check(map: Map<string, Bucket>, key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const b = map.get(key);
  if (!b || now > b.resetAt) {
    map.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }
  if (b.count >= limit) return { ok: false, remaining: 0, resetAt: b.resetAt };
  b.count += 1;
  return { ok: true, remaining: limit - b.count };
}

export function rateLimit(ip: string) {
  const m = check(perMinute, ip, PER_MINUTE_LIMIT, 60_000);
  if (!m.ok) return { ok: false, reason: `rate limit: ${PER_MINUTE_LIMIT} requests/minute` };
  const d = check(perDay, ip, PER_DAY_LIMIT, 24 * 60 * 60_000);
  if (!d.ok) return { ok: false, reason: `daily cap: ${PER_DAY_LIMIT} requests/day` };
  return { ok: true };
}
