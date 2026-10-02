interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const loginAttempts = new Map<string, RateLimitRecord>();

/**
 * Basic in-memory rate limiter & lockout for authentication endpoints.
 * @param key Identifier (e.g. IP address or email)
 * @param maxAttempts Max allowed failed attempts before lockout (default: 5)
 * @param windowMs Time window in milliseconds (default: 15 minutes)
 */
export function checkLoginRateLimit(
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000
): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
  const now = Date.now();
  const record = loginAttempts.get(key);

  if (!record || now > record.resetTime) {
    loginAttempts.set(key, { count: 0, resetTime: now + windowMs });
    return { allowed: true, remaining: maxAttempts, retryAfterSeconds: 0 };
  }

  if (record.count >= maxAttempts) {
    const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }

  return {
    allowed: true,
    remaining: maxAttempts - record.count,
    retryAfterSeconds: 0,
  };
}

export function recordFailedLoginAttempt(key: string, windowMs: number = 15 * 60 * 1000): void {
  const now = Date.now();
  const record = loginAttempts.get(key);

  if (!record || now > record.resetTime) {
    loginAttempts.set(key, { count: 1, resetTime: now + windowMs });
  } else {
    record.count += 1;
  }
}

export function clearLoginAttempts(key: string): void {
  loginAttempts.delete(key);
}
