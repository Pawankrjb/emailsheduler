import { redisClient } from '../config/redis.js';
import { config } from '../config/env.js';

export interface RateLimitCheckResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
  delayUntilNextWindowMs?: number;
  rescheduledTo?: Date;
}

export class RateLimiter {
  /**
   * Generates a Redis key for the sender and the current hour window.
   * Format: ratelimit:{sender}:{YYYY-MM-DDTHH}
   */
  private static getWindowKey(sender: string, date: Date = new Date()): string {
    const hourWindow = date.toISOString().slice(0, 13); // e.g. "2026-10-24T17"
    const sanitizedSender = sender.toLowerCase().trim();
    return `ratelimit:${sanitizedSender}:${hourWindow}`;
  }

  /**
   * Atomically checks and reserves an email slot for the given sender in the current hour window.
   * If the limit is exceeded, the counter is rolled back and the exact delay until the next hour window is calculated.
   */
  static async checkAndConsume(
    sender: string,
    customHourlyLimit?: number
  ): Promise<RateLimitCheckResult> {
    const limit = customHourlyLimit || config.worker.maxEmailsPerHour;
    const now = new Date();
    const key = this.getWindowKey(sender, now);

    // Atomically increment the Redis counter
    const currentCount = await redisClient.incr(key);

    // On first increment, set TTL to 2 hours (7200 seconds) so Redis cleans up automatically
    if (currentCount === 1) {
      await redisClient.expire(key, 7200);
    }

    if (currentCount > limit) {
      // Revert the increment since the email will be rescheduled and not sent yet
      await redisClient.decr(key);

      // Calculate time remaining until the next hour window begins
      const nextHour = new Date(now);
      nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
      const delayUntilNextWindowMs = Math.max(1000, nextHour.getTime() - now.getTime() + 1000);

      return {
        allowed: false,
        currentCount: currentCount - 1,
        limit,
        delayUntilNextWindowMs,
        rescheduledTo: nextHour,
      };
    }

    return {
      allowed: true,
      currentCount,
      limit,
    };
  }

  /**
   * Inspect current usage without incrementing
   */
  static async getCurrentUsage(sender: string): Promise<{ count: number; limit: number }> {
    const key = this.getWindowKey(sender);
    const val = await redisClient.get(key);
    return {
      count: val ? parseInt(val, 10) : 0,
      limit: config.worker.maxEmailsPerHour,
    };
  }
}
