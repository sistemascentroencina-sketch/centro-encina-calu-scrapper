import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { ZodError } from 'zod';
import { requireApiKey } from './api/middleware/api-key.js';
import { appointmentRoutes } from './api/routes/appointments.js';
import { centreRoutes } from './api/routes/centre.js';
import { docsRoutes } from './api/routes/docs.js';
import { healthRoutes } from './api/routes/health.js';
import { openApiRoutes } from './api/routes/openapi.js';
import { patientRoutes } from './api/routes/patients.js';
import { professionalRoutes } from './api/routes/professionals.js';
import { serviceRoutes } from './api/routes/services.js';
import { slotRoutes } from './api/routes/slots.js';
import { HttpError } from './domain/errors.js';

export function buildApp() {
  const app = new Hono();

  app.use(
    '*',
    cors({
      origin: '*',
      allowHeaders: ['Content-Type', 'X-Api-Key'],
      allowMethods: ['GET', 'POST', 'OPTIONS'],
    }),
  );

  app.get('/', (c) => c.redirect('/v1/docs'));
  app.get('/docs', (c) => c.redirect('/v1/docs'));

  app.use('/v1/*', requireApiKey);

  const v1 = new Hono();
  v1.route('/', healthRoutes);
  v1.route('/', openApiRoutes);
  v1.route('/', docsRoutes);
  v1.route('/', centreRoutes);
  v1.route('/', patientRoutes);
  v1.route('/', professionalRoutes);
  v1.route('/', serviceRoutes);
  v1.route('/', slotRoutes);
  v1.route('/', appointmentRoutes);
  app.route('/v1', v1);

  app.onError((err, c) => {
    if (err instanceof HttpError) {
      return c.json({ error: err.message, code: err.code }, err.status as 400);
    }
    if (err instanceof ZodError) {
      return c.json({ error: 'Validation error', code: 'VALIDATION', details: err.flatten() }, 422);
    }
    console.error(err);
    return c.json({ error: 'Internal error', code: 'INTERNAL' }, 500);
  });

  return app;
}
