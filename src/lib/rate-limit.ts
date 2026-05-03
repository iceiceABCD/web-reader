class RateLimiter {
  private attempts = new Map<string, { count: number; resetAt: number }>();

  check(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const record = this.attempts.get(key);

    if (!record || now > record.resetAt) {
      this.attempts.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }

    if (record.count >= limit) {
      return false;
    }

    record.count++;
    return true;
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }
}

export const rateLimiter = new RateLimiter();

export function getClientId(userId: string, path: string): string {
  return `${userId}:${path}`;
}
