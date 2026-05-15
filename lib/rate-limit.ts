/**
 * Simple in-memory rate limiter for API routes.
 * Works well for single-instance deployments (local dev, single Vercel function).
 * For multi-instance production use, replace with Redis-backed store.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Clean up expired entries every 5 minutes to avoid memory leaks
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) store.delete(key)
  }
}, 5 * 60 * 1000)

export interface RateLimitOptions {
  /** Time window in milliseconds */
  windowMs: number
  /** Max requests allowed per window */
  max: number
}

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetAt: number
}

export function rateLimit(ip: string, key: string, opts: RateLimitOptions): RateLimitResult {
  const storeKey = `${key}:${ip}`
  const now = Date.now()
  const entry = store.get(storeKey)

  if (!entry || entry.resetAt <= now) {
    store.set(storeKey, { count: 1, resetAt: now + opts.windowMs })
    return { success: true, remaining: opts.max - 1, resetAt: now + opts.windowMs }
  }

  if (entry.count >= opts.max) {
    return { success: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count++
  return { success: true, remaining: opts.max - entry.count, resetAt: entry.resetAt }
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') ?? '127.0.0.1'
}
