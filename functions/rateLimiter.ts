import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Rate limiting middleware for backend functions
 * Tracks requests per user to prevent abuse
 */
const rateLimitStore = new Map();
const RATE_LIMIT = { requests: 100, window: 60 * 1000 }; // 100 req/min per user

export async function checkRateLimit(req) {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    if (!user) {
      return { allowed: false, status: 401, message: 'Unauthorized' };
    }

    const userId = user.email;
    const now = Date.now();
    const key = `${userId}`;

    // Initialize or get user's rate limit data
    if (!rateLimitStore.has(key)) {
      rateLimitStore.set(key, { count: 0, resetTime: now + RATE_LIMIT.window });
    }

    const userData = rateLimitStore.get(key);

    // Reset window if expired
    if (now > userData.resetTime) {
      userData.count = 0;
      userData.resetTime = now + RATE_LIMIT.window;
    }

    // Check limit
    if (userData.count >= RATE_LIMIT.requests) {
      const retryAfter = Math.ceil((userData.resetTime - now) / 1000);
      return {
        allowed: false,
        status: 429,
        message: `Rate limit exceeded. Retry after ${retryAfter}s`,
        retryAfter,
      };
    }

    userData.count++;
    return { allowed: true, user };
  } catch (error) {
    return { allowed: false, status: 500, message: error.message };
  }
}

export default checkRateLimit;