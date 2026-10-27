import { Hono } from 'hono';
import { z } from 'zod';
import * as slots from '../../scrape/adapters/slots.js';

export const slotRoutes = new Hono();

const querySchema = z.object({
  professionalId: z.string().min(1),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeZone: z.string().optional(),
});

slotRoutes.get('/slots', async (c) => {
  const q = querySchema.parse({
    professionalId: c.req.query('professionalId'),
    from: c.req.query('from'),
    to: c.req.query('to'),
    timeZone: c.req.query('timeZone') ?? undefined,
  });
  const list = await slots.listSlots(q);
  return c.json({ professionalId: q.professionalId, slots: list });
});
