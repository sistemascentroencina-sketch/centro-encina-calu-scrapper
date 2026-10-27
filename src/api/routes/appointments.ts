import { Hono } from 'hono';
import { z } from 'zod';
import { HttpError } from '../../domain/errors.js';
import * as appointments from '../../scrape/adapters/appointments.js';

export const appointmentRoutes = new Hono();

appointmentRoutes.get('/appointments/next', async (c) => {
  const patientId = c.req.query('patientId');
  if (!patientId) {
    return c.json({ error: 'patientId requerido', code: 'VALIDATION' }, 422);
  }
  const next = await appointments.getNextAppointment(patientId);
  if (!next) return c.json({ appointment: null });
  return c.json({ appointment: next });
});

appointmentRoutes.get('/appointments', async (c) => {
  const patientId = c.req.query('patientId');
  if (!patientId) {
    return c.json({ error: 'patientId requerido', code: 'VALIDATION' }, 422);
  }
  const scope = (c.req.query('scope') ?? 'all') as 'upcoming' | 'history' | 'all';
  if (!['upcoming', 'history', 'all'].includes(scope)) {
    return c.json({ error: 'scope inválido', code: 'VALIDATION' }, 422);
  }
  const typeRaw = c.req.query('type');
  const type = typeRaw
    ? z.enum(['admission', 'session']).parse(typeRaw)
    : undefined;
  const items = await appointments.listAppointments({ patientId, scope, type });
  return c.json({ items });
});

appointmentRoutes.get('/appointments/:id', async (c) => {
  const appt = await appointments.getAppointment(c.req.param('id'));
  if (!appt) throw new HttpError(404, 'Turno no encontrado', 'APPT_NOT_FOUND');
  return c.json(appt);
});

const createSchema = z.object({
  patientId: z.string().min(1),
  professionalId: z.string().min(1),
  slotId: z.string().min(1),
  type: z.enum(['admission', 'session']),
  paymentRef: z.string().optional(),
  markPaid: z.boolean().optional(),
});

appointmentRoutes.post('/appointments', async (c) => {
  const body = createSchema.parse(await c.req.json());
  const appt = await appointments.createAppointment(body);
  return c.json(appt, 201);
});

appointmentRoutes.post('/appointments/:id/reschedule', async (c) => {
  const body = z.object({ slotId: z.string().min(1) }).parse(await c.req.json());
  const appt = await appointments.rescheduleAppointment(c.req.param('id'), body.slotId);
  return c.json(appt);
});

appointmentRoutes.post('/appointments/:id/cancel', async (c) => {
  // reason opcional (aceptado, no usado en mock/live gated)
  if (c.req.header('content-type')?.includes('json')) {
    await c.req.json().catch(() => ({}));
  }
  const appt = await appointments.cancelAppointment(c.req.param('id'));
  return c.json(appt);
});
