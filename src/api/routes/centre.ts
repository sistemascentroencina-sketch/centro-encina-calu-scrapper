import { Hono } from 'hono';
import * as centre from '../../scrape/adapters/centre.js';

export const centreRoutes = new Hono();

centreRoutes.get('/centre', async (c) => {
  const info = await centre.getCentreInfo();
  return c.json(info);
});
