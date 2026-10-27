import type { Appointment, Patient, Professional, Slot } from '../domain/types.js';

export const professionals: Professional[] = [
  {
    id: 'adm-ana',
    displayName: 'Lic. Ana Torres',
    title: 'Admisión',
    focus: 'Evaluación y derivación',
    kind: 'admission',
    bookable: true,
  },
  {
    id: 'pro-lucia',
    displayName: 'Dra. Lucía Fernández',
    title: 'Psicóloga clínica',
    focus: 'Ansiedad y estrés · TCC',
    kind: 'clinical',
    bookable: true,
  },
  {
    id: 'pro-martin',
    displayName: 'Lic. Martín Díaz',
    title: 'Psicólogo',
    focus: 'Terapia de pareja',
    kind: 'clinical',
    bookable: true,
  },
];

export const centre = {
  id: 'centre-mock',
  name: 'Centro Encina (mock)',
};

/** Pacientes seed alineados al demo */
export const patients: Patient[] = [
  {
    id: 'pat-maria',
    dni: '45999888',
    firstName: 'María',
    lastName: 'Gómez',
    timeZone: 'Europe/Madrid',
    assignedProfessionalId: null,
    isFirstVisit: true,
  },
  {
    id: 'pat-juan',
    dni: '30111222',
    firstName: 'Juan',
    lastName: 'Pérez',
    timeZone: 'America/Argentina/Buenos_Aires',
    assignedProfessionalId: 'pro-lucia',
    isFirstVisit: false,
  },
];

export const appointments: Appointment[] = [
  {
    id: 'appt-juan-hist',
    patientId: 'pat-juan',
    professionalId: 'pro-lucia',
    professionalName: 'Dra. Lucía Fernández',
    type: 'session',
    startsAt: '2025-09-04T18:00:00.000Z',
    endsAt: '2025-09-04T19:00:00.000Z',
    status: 'completed',
    timeZone: 'America/Argentina/Buenos_Aires',
  },
];

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(base: Date, n: number): Date {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

function atUtc(date: Date, hour: number, minute = 0): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), hour, minute, 0));
  return d.toISOString();
}

/** Slots demo relativos a “hoy” (UTC), duración 1h */
export function buildMockSlots(professionalId: string, from: string, to: string): Slot[] {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const catalog: Record<string, Array<{ offset: number; hour: number; minute?: number; label: string }>> = {
    'adm-ana': [
      { offset: 1, hour: 12, label: '09:00' },
      { offset: 1, hour: 14, label: '11:00' },
      { offset: 2, hour: 17, label: '14:00' },
      { offset: 3, hour: 13, label: '10:00' },
      { offset: 5, hour: 15, label: '12:00' },
    ],
    'pro-lucia': [
      { offset: 2, hour: 20, label: '17:00' },
      { offset: 2, hour: 21, label: '18:00' },
      { offset: 3, hour: 19, label: '16:00' },
      { offset: 3, hour: 21, label: '18:00' },
      { offset: 3, hour: 22, minute: 30, label: '19:30' },
      { offset: 4, hour: 13, label: '10:00' },
      { offset: 4, hour: 23, label: '20:00' },
      { offset: 5, hour: 21, label: '18:00' },
    ],
  };

  const rows = catalog[professionalId] ?? catalog['pro-lucia'] ?? [];
  return rows
    .map((r) => {
      const day = addDays(today, r.offset);
      const dateLocal = ymd(day);
      const startsAt = atUtc(day, r.hour, r.minute ?? 0);
      const end = new Date(startsAt);
      end.setUTCHours(end.getUTCHours() + 1);
      return {
        id: `${professionalId}:${dateLocal}T${r.label}`,
        startsAt,
        endsAt: end.toISOString(),
        localLabel: r.label,
        dateLocal,
      };
    })
    .filter((s) => s.dateLocal >= from && s.dateLocal <= to);
}
