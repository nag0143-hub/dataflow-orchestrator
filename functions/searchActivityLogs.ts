import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import checkRateLimit from './rateLimiter.js';

/**
 * Server-side search for activity logs with pagination
 */
Deno.serve(async (req) => {
  try {
    const rateCheck = await checkRateLimit(req);
    if (!rateCheck.allowed) {
      return Response.json(
        { error: rateCheck.message },
        { status: rateCheck.status, headers: { 'Retry-After': rateCheck.retryAfter } }
      );
    }

    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { searchTerm = '', filters = {}, cursor = null, limit = 50 } = body;

    const query = {
      ...filters,
      ...(searchTerm && {
        $or: [
          { message: { $regex: searchTerm, $options: 'i' } },
          { category: { $regex: searchTerm, $options: 'i' } },
          { object_name: { $regex: searchTerm, $options: 'i' } },
        ],
      }),
    };

    const logs = await base44.entities.ActivityLog.filter(query, '-created_date', limit + 1);

    const hasNext = logs.length > limit;
    const items = hasNext ? logs.slice(0, limit) : logs;
    const nextCursor = hasNext ? items[items.length - 1].id : null;

    return Response.json({
      items,
      nextCursor,
      hasMore: hasNext,
      count: items.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});