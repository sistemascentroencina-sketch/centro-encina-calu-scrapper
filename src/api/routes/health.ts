import { Hono } from 'hono';
import { getCaluSessionStatus } from '../../auth/calu-session.js';
import { config } from '../../config.js';

export const healthRoutes = new Hono();

healthRoutes.get('/health', async (c) => {
  const caluSession = await getCaluSessionStatus();
  return c.json({
    ok: true,
    mode: config.mock ? 'mock' : 'live',
    caluSession,
    writesEnabled: config.allowWrites,
  });
});
