import type { Appointment, AppointmentStatus, Patient, Professional } from '../domain/types.js';
import type { CheDocDoctor, CheDocPatient, CheDocTurn } from './chedoc-client.js';

function isAdmissionDoctor(d: CheDocDoctor): boolean {
  const blob = `${d.firstname || ''} ${d.lastname || ''} ${d.email || ''}`.toLowerCase();
  return /admis/.test(blob);
}

export function mapDoctor(d: CheDocDoctor): Professional {
  const displayName = `${d.firstname || ''} ${d.lastname || ''}`.trim() || d.email || d._id;
  const focus = d.specialities?.map((s) => s.name).filter(Boolean).join(' · ') || '';
  return {
    id: d._id,
    displayName,
    title: isAdmissionDoctor(d) ? 'Admisión' : 'Profesional',
    focus,
    kind: isAdmissionDoctor(d) ? 'admission' : 'clinical',
    bookable: (d.workTimes || []).length > 0,
  };
}

export function mapPatient(
  p: CheDocPatient,
  opts: { assignedProfessionalId?: string | null; isFirstVisit?: boolean } = {},
): Patient {
  return {
    id: p._id,
    dni: String(p.dni || '').trim(),
    firstName: (p.firstname || '').trim(),
    lastName: (p.lastname || '').trim(),
    timeZone: p.timeZone || 'America/Argentina/Buenos_Aires',
    assignedProfessionalId: opts.assignedProfessionalId ?? null,
    isFirstVisit: opts.isFirstVisit ?? false,
    phone: p.mobile != null ? String(p.mobile) : undefined,
    email: p.email,
  };
}

function mapState(state?: string): AppointmentStatus {
  switch ((state || '').toLowerCase()) {
    case 'confirmed':
      return 'confirmed';
    case 'cancelled':
    case 'canceled':
      return 'cancelled';
    case 'init':
    default:
      return 'pending_confirm';
  }
}

function doctorCentreId(t: CheDocTurn): string {
  if (typeof t.doctorCentre === 'string') return t.doctorCentre;
  return t.doctorCentre?._id || '';
}

function patientCentreId(t: CheDocTurn): string {
  if (typeof t.patientCentre === 'string') return t.patientCentre;
  return t.patientCentre?._id || '';
}

function serviceSuggestsAdmission(t: CheDocTurn): boolean {
  const svc = t.service;
  if (!svc || typeof svc === 'string') return false;
  return /admis/i.test(svc.name || '');
}

export function mapTurn(t: CheDocTurn): Appointment {
  const startsAt = t.startHour || new Date().toISOString();
  const endsAt =
    t.finishHour ||
    new Date(new Date(startsAt).getTime() + (t.consultationDuration || 40) * 60_000).toISOString();
  const first = Boolean(t.firstTime) || serviceSuggestsAdmission(t);
  return {
    id: t._id,
    patientId: patientCentreId(t),
    professionalId: doctorCentreId(t),
    professionalName: t.doctorName || '',
    type: first ? 'admission' : 'session',
    startsAt,
    endsAt,
    status: mapState(t.state),
    timeZone: 'America/Argentina/Buenos_Aires',
  };
}
