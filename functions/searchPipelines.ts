import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import checkRateLimit from './rateLimiter.js';

/**
 * Server-side search for pipelines with pagination
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
          { name: { $regex: searchTerm, $options: 'i' } },
          { description: { $regex: searchTerm, $options: 'i' } },
        ],
      }),
    };

    const pipelines = await base44.entities.Pipeline.filter(query, '-updated_date', limit + 1);

    const hasNext = pipelines.length > limit;
    const items = hasNext ? pipelines.slice(0, limit) : pipelines;
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