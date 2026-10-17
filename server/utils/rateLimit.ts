const buckets = new Map<string, { count: number, resetAt: number }>()

export function assertRateLimit(key: string, limit = 120, windowMs = 60_000) {
  const now = Date.now()
  const entry = buckets.get(key)
  if (!entry || entry.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return
  }
  entry.count += 1
  if (entry.count > limit) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too many requests'
    })
  }
}
