import type { Slot } from '../domain/types.js';
import type { CheDocDoctor, CheDocTurn } from './chedoc-client.js';

function parseHmFromIso(iso: string): { h: number; m: number } {
  const d = new Date(iso);
  return { h: d.getUTCHours(), m: d.getUTCMinutes() };
}

function doctorId(t: CheDocTurn): string {
  if (typeof t.doctorCentre === 'string') return t.doctorCentre;
  return t.doctorCentre?._id || '';
}

function formatInZone(iso: string, timeZone: string): { label: string; dateLocal: string } {
  try {
    const d = new Date(iso);
    const label = new Intl.DateTimeFormat('es-AR', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);
    const dateLocal = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
    return { label, dateLocal };
  } catch {
    const d = new Date(iso);
    const label = `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
    return { label, dateLocal: d.toISOString().slice(0, 10) };
  }
}

/**
 * Calcula slots libres a partir de workTimes del profesional menos turnos no cancelados.
 * Solo lectura / cómputo local — no llama mutaciones.
 */
export function computeFreeSlots(opts: {
  doctor: CheDocDoctor;
  turns: CheDocTurn[];
  from: string;
  to: string;
  timeZone?: string;
}): Slot[] {
  const workTimes = opts.doctor.workTimes || [];
  if (!workTimes.length) return [];
  const tz = opts.timeZone || 'UTC';

  const occupied = (opts.turns || []).filter((t) => {
    if (doctorId(t) !== opts.doctor._id) return false;
    const st = (t.state || '').toLowerCase();
    return st !== 'cancelled' && st !== 'canceled';
  });

  const noWork = opts.doctor.noWorkTimes || [];
  const slots: Slot[] = [];
  const from = new Date(`${opts.from}T00:00:00.000Z`);
  const to = new Date(`${opts.to}T00:00:00.000Z`);

  for (let day = new Date(from); day <= to; day.setUTCDate(day.getUTCDate() + 1)) {
    const dayCode = day.getUTCDay();
    const dayStart = new Date(day);

    const blocked = noWork.some((nw) => {
      if (!nw.startDate || !nw.finishDate) return false;
      const a = new Date(nw.startDate).getTime();
      const b = new Date(nw.finishDate).getTime();
      const t = dayStart.getTime();
      return t >= a && t <= b;
    });
    if (blocked) continue;

    for (const wt of workTimes) {
      if (wt.weekDay?.code !== dayCode) continue;
      if (!wt.startTime || !wt.finishTime) continue;
      const duration = wt.turnDuration && wt.turnDuration > 0 ? wt.turnDuration : 40;
      const startHm = parseHmFromIso(wt.startTime);
      const finishHm = parseHmFromIso(wt.finishTime);

      let cursor = new Date(day);
      cursor.setUTCHours(startHm.h, startHm.m, 0, 0);
      const end = new Date(day);
      end.setUTCHours(finishHm.h, finishHm.m, 0, 0);

      while (cursor.getTime() + duration * 60_000 <= end.getTime()) {
        const startsAt = new Date(cursor);
        const endsAt = new Date(cursor.getTime() + duration * 60_000);
        const clash = occupied.some((t) => {
          if (!t.startHour || !t.finishHour) return false;
          const a = new Date(t.startHour).getTime();
          const b = new Date(t.finishHour).getTime();
          return startsAt.getTime() < b && endsAt.getTime() > a;
        });
        if (!clash) {
          const { label, dateLocal } = formatInZone(startsAt.toISOString(), tz);
          slots.push({
            id: `${opts.doctor._id}:${startsAt.toISOString()}`,
            startsAt: startsAt.toISOString(),
            endsAt: endsAt.toISOString(),
            localLabel: label,
            dateLocal,
          });
        }
        cursor = new Date(cursor.getTime() + duration * 60_000);
      }
    }
  }

  return slots.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}
