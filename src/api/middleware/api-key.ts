import { createMiddleware } from 'hono/factory';
import { config } from '../../config.js';

const PUBLIC_PATHS = new Set(['/v1/health', '/v1/openapi.json', '/v1/docs']);

export const requireApiKey = createMiddleware(async (c, next) => {
  if (PUBLIC_PATHS.has(c.req.path)) {
    await next();
    return;
  }
  const key = c.req.header('x-api-key');
  if (!key || key !== config.apiKey) {
    return c.json({ error: 'Unauthorized', code: 'BAD_API_KEY' }, 401);
  }
  await next();
});
