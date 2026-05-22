interface Window {
  count: number;
  resetAt: number;
}

const store = new Map<string, Window>();

function prune() {
  const now = Date.now();
  for (const [key, win] of store) {
    if (win.resetAt < now) store.delete(key);
  }
}

/**
 * Returns true if the request should be rate-limited (limit exceeded).
 * Uses a fixed-window counter keyed by `${route}:${userId}`.
 *
 * @param userId  Supabase user id
 * @param route   Route identifier, e.g. 'stream'
 * @param max     Maximum requests per window
 * @param windowMs Window size in milliseconds
 */
export function isRateLimited(
  userId: string,
  route: string,
  max: number,
  windowMs: number,
): boolean {
  prune();
  const key = `${route}:${userId}`;
  const now = Date.now();
  const win = store.get(key);

  if (!win || win.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  win.count += 1;
  return win.count > max;
}
