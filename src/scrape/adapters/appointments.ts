import { config, useLiveReads } from '../../config.js';
import { HttpError } from '../../domain/errors.js';
import type { Appointment, AppointmentType } from '../../domain/types.js';
import * as mock from '../../mock/data.js';
import { buildMockSlots } from '../../mock/data.js';
import { findTurnById, listTurns } from '../chedoc-client.js';
import { mapTurn } from '../mappers.js';

function findSlot(professionalId: string, slotId: string) {
  const [from, to] = ['2025-01-01', '2030-12-31'];
  return buildMockSlots(professionalId, from, to).find((s) => s.id === slotId);
}

function writeBlocked(): never {
  throw new HttpError(
    403,
    'Mutaciones de turnos deshabilitadas en producción (solo lectura)',
    'WRITE_DISABLED',
  );
}

export async function getAppointment(id: string): Promise<Appointment | null> {
  if (!useLiveReads()) {
    return mock.appointments.find((a) => a.id === id) ?? null;
  }
  const turn = await findTurnById(id);
  return turn ? mapTurn(turn) : null;
}

export async function listAppointments(opts: {
  patientId: string;
  scope: 'upcoming' | 'history' | 'all';
  type?: AppointmentType;
}): Promise<Appointment[]> {
  let items: Appointment[];
  if (!useLiveReads()) {
    const now = Date.now();
    items = mock.appointments
      .filter((a) => a.patientId === opts.patientId)
      .filter((a) => {
        if (opts.scope === 'all') return true;
        const t = new Date(a.startsAt).getTime();
        if (opts.scope === 'upcoming') {
          return t >= now && a.status !== 'cancelled' && a.status !== 'completed';
        }
        return t < now || a.status === 'completed' || a.status === 'cancelled';
      })
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  } else {
    const start = new Date();
    start.setUTCMonth(start.getUTCMonth() - 3);
    start.setUTCHours(0, 0, 0, 0);
    const finish = new Date();
    finish.setUTCMonth(finish.getUTCMonth() + 3);
    finish.setUTCHours(23, 59, 0, 0);

    const turns = await listTurns(start.toISOString(), finish.toISOString());
    const now = Date.now();
    items = turns
      .map(mapTurn)
      .filter((a) => a.patientId === opts.patientId)
      .filter((a) => {
        if (opts.scope === 'all') return true;
        const t = new Date(a.startsAt).getTime();
        if (opts.scope === 'upcoming') {
          return t >= now && a.status !== 'cancelled' && a.status !== 'completed';
        }
        return t < now || a.status === 'cancelled' || a.status === 'completed';
      })
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }
  if (opts.type) items = items.filter((a) => a.type === opts.type);
  return items;
}

/** Próximo turno no cancelado (home paciente). */
export async function getNextAppointment(patientId: string): Promise<Appointment | null> {
  const upcoming = await listAppointments({ patientId, scope: 'upcoming' });
  return upcoming[0] ?? null;
}

export async function createAppointment(input: {
  patientId: string;
  professionalId: string;
  slotId: string;
  type: AppointmentType;
  paymentRef?: string;
  markPaid?: boolean;
}): Promise<Appointment> {
  if (!useLiveReads()) {
    const pro = mock.professionals.find((p) => p.id === input.professionalId);
    if (!pro) throw new HttpError(404, 'Profesional no encontrado', 'PRO_NOT_FOUND');
    const slot = findSlot(input.professionalId, input.slotId);
    if (!slot) throw new HttpError(422, 'Slot inválido', 'SLOT_INVALID');
    const clash = mock.appointments.find(
      (a) =>
        a.professionalId === input.professionalId &&
        a.startsAt === slot.startsAt &&
        a.status !== 'cancelled',
    );
    if (clash) throw new HttpError(409, 'Slot ya tomado', 'SLOT_TAKEN');

    const patient = mock.patients.find((p) => p.id === input.patientId);
    if (!patient) throw new HttpError(404, 'Paciente no encontrado', 'PATIENT_NOT_FOUND');

    const appt: Appointment = {
      id: `appt-${Date.now()}`,
      patientId: input.patientId,
      professionalId: input.professionalId,
      professionalName: pro.displayName,
      type: input.type,
      startsAt: slot.startsAt,
      endsAt: slot.endsAt,
      status: input.markPaid ? 'paid' : 'pending_confirm',
      timeZone: patient.timeZone,
      paymentRef: input.paymentRef,
    };
    mock.appointments.push(appt);

    if (input.type === 'session' && !patient.assignedProfessionalId) {
      patient.assignedProfessionalId = input.professionalId;
      patient.isFirstVisit = false;
    }
    return appt;
  }

  if (!config.allowWrites) writeBlocked();
  throw new HttpError(501, 'Alta live de turnos aún no implementada', 'LIVE_TODO');
}

export async function rescheduleAppointment(id: string, slotId: string): Promise<Appointment> {
  if (!useLiveReads()) {
    const appt = mock.appointments.find((a) => a.id === id);
    if (!appt) throw new HttpError(404, 'Turno no encontrado', 'APPT_NOT_FOUND');
    if (appt.status === 'cancelled') throw new HttpError(422, 'Turno cancelado', 'APPT_CANCELLED');
    const slot = findSlot(appt.professionalId, slotId);
    if (!slot) throw new HttpError(422, 'Slot inválido', 'SLOT_INVALID');
    appt.startsAt = slot.startsAt;
    appt.endsAt = slot.endsAt;
    return appt;
  }
  if (!config.allowWrites) writeBlocked();
  throw new HttpError(501, 'Reprogramación live aún no implementada', 'LIVE_TODO');
}

export async function cancelAppointment(id: string): Promise<Appointment> {
  if (!useLiveReads()) {
    const appt = mock.appointments.find((a) => a.id === id);
    if (!appt) throw new HttpError(404, 'Turno no encontrado', 'APPT_NOT_FOUND');
    appt.status = 'cancelled';
    return appt;
  }
  if (!config.allowWrites) writeBlocked();
  throw new HttpError(501, 'Cancelación live aún no implementada', 'LIVE_TODO');
}
