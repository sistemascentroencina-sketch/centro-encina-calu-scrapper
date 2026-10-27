import { Hono } from 'hono';
import { z } from 'zod';
import { HttpError } from '../../domain/errors.js';
import * as professionals from '../../scrape/adapters/professionals.js';

export const professionalRoutes = new Hono();

professionalRoutes.get('/professionals', async (c) => {
  const kindRaw = c.req.query('kind');
  const kind = kindRaw
    ? z.enum(['clinical', 'admission']).parse(kindRaw)
    : undefined;
  const bookableRaw = c.req.query('bookable');
  let bookable: boolean | undefined;
  if (bookableRaw === 'true' || bookableRaw === '1') bookable = true;
  if (bookableRaw === 'false' || bookableRaw === '0') bookable = false;
  const items = await professionals.listProfessionals({ kind, bookable });
  return c.json({ items });
});

professionalRoutes.get('/professionals/:id', async (c) => {
  const pro = await professionals.getProfessional(c.req.param('id'));
  if (!pro) throw new HttpError(404, 'Profesional no encontrado', 'PRO_NOT_FOUND');
  return c.json(pro);
});
