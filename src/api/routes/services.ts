import { Hono } from 'hono';
import * as services from '../../scrape/adapters/services.js';

export const serviceRoutes = new Hono();

serviceRoutes.get('/services', async (c) => {
  const items = await services.listServices();
  return c.json({ items });
});
