import { config, useLiveReads } from '../../config.js';
import { HttpError } from '../../domain/errors.js';
import type { Patient } from '../../domain/types.js';
import * as mock from '../../mock/data.js';
import { findPatientByDni, getPatientById, listTurns } from '../chedoc-client.js';
import { mapPatient } from '../mappers.js';

async function enrichFromTurns(patientId: string): Promise<{
  assignedProfessionalId: string | null;
  isFirstVisit: boolean;
}> {
  const start = new Date();
  start.setUTCMonth(start.getUTCMonth() - 6);
  const finish = new Date();
  finish.setUTCMonth(finish.getUTCMonth() + 2);
  const turns = await listTurns(start.toISOString(), finish.toISOString());
  const mine = turns
    .filter((t) => {
      const pid = typeof t.patientCentre === 'string' ? t.patientCentre : t.patientCentre?._id;
      return pid === patientId && (t.state || '').toLowerCase() !== 'cancelled';
    })
    .sort((a, b) => String(b.startHour).localeCompare(String(a.startHour)));

  const clinical = mine.find((t) => {
    const first = Boolean(t.firstTime);
    const svc = t.service;
    const admName = svc && typeof svc !== 'string' ? /admis/i.test(svc.name || '') : false;
    return !first && !admName;
  });
  const latest = clinical || mine[0];
  const assignedProfessionalId = latest
    ? typeof latest.doctorCentre === 'string'
      ? latest.doctorCentre
      : latest.doctorCentre?._id || null
    : null;

  return {
    assignedProfessionalId,
    isFirstVisit: mine.length === 0,
  };
}

export async function getByDni(dni: string): Promise<Patient | null> {
  if (!useLiveReads()) {
    return mock.patients.find((p) => p.dni === dni) ?? null;
  }
  const raw = await findPatientByDni(dni);
  if (!raw) return null;
  const enrich = await enrichFromTurns(raw._id);
  return mapPatient(raw, enrich);
}

export async function getById(id: string): Promise<Patient | null> {
  if (!useLiveReads()) {
    return mock.patients.find((p) => p.id === id) ?? null;
  }
  const raw = await getPatientById(id);
  if (!raw) return null;
  const enrich = await enrichFromTurns(raw._id);
  return mapPatient(raw, enrich);
}

export async function createPatient(input: {
  dni: string;
  firstName: string;
  lastName: string;
  timeZone: string;
  phone?: string;
  email?: string;
}): Promise<Patient> {
  if (!useLiveReads()) {
    const existing = mock.patients.find((p) => p.dni === input.dni);
    if (existing) return existing;
    const created: Patient = {
      id: `pat-${input.dni}`,
      dni: input.dni,
      firstName: input.firstName,
      lastName: input.lastName,
      timeZone: input.timeZone,
      assignedProfessionalId: null,
      isFirstVisit: true,
      phone: input.phone,
      email: input.email,
    };
    mock.patients.push(created);
    return created;
  }

  const existing = await getByDni(input.dni);
  if (existing) return existing;
  if (!config.allowWrites) {
    throw new HttpError(
      403,
      'Alta de pacientes deshabilitada en producción (solo lectura)',
      'WRITE_DISABLED',
    );
  }
  throw new HttpError(501, 'Alta live de pacientes aún no implementada', 'LIVE_TODO');
}
