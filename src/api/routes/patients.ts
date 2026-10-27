import { Hono } from 'hono';
import { z } from 'zod';
import { HttpError } from '../../domain/errors.js';
import * as patients from '../../scrape/adapters/patients.js';

export const patientRoutes = new Hono();

patientRoutes.get('/patients/by-dni/:dni', async (c) => {
  const dni = c.req.param('dni');
  const patient = await patients.getByDni(dni);
  if (!patient) throw new HttpError(404, 'Paciente no encontrado', 'PATIENT_NOT_FOUND');
  return c.json(patient);
});

patientRoutes.get('/patients/:id', async (c) => {
  const patient = await patients.getById(c.req.param('id'));
  if (!patient) throw new HttpError(404, 'Paciente no encontrado', 'PATIENT_NOT_FOUND');
  return c.json(patient);
});

const createSchema = z.object({
  dni: z.string().min(5),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  timeZone: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
});

patientRoutes.post('/patients', async (c) => {
  const body = createSchema.parse(await c.req.json());
  const patient = await patients.createPatient(body);
  return c.json(patient, 201);
});
