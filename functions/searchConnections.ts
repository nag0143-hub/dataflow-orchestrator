import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import checkRateLimit from './rateLimiter.js';

/**
 * Server-side search for connections with pagination
 * Reduces client-side data and improves performance
 */
Deno.serve(async (req) => {
  try {
    // Rate limiting
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

    // Build filter query
    const query = {
      ...filters,
      ...(searchTerm && {
        $or: [
          { name: { $regex: searchTerm, $options: 'i' } },
          { description: { $regex: searchTerm, $options: 'i' } },
          { platform: { $regex: searchTerm, $options: 'i' } },
        ],
      }),
    };

    // Fetch with pagination
    const connections = await base44.entities.Connection.filter(query, '-created_date', limit + 1);

    const hasNext = connections.length > limit;
    const items = hasNext ? connections.slice(0, limit) : connections;
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