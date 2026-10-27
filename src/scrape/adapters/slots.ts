import { useLiveReads } from '../../config.js';
import type { Slot } from '../../domain/types.js';
import { buildMockSlots } from '../../mock/data.js';
import { listDoctors, listTurns } from '../chedoc-client.js';
import { computeFreeSlots } from '../slots-from-worktimes.js';

export async function listSlots(opts: {
  professionalId: string;
  from: string;
  to: string;
  timeZone?: string;
}): Promise<Slot[]> {
  if (!useLiveReads()) {
    return buildMockSlots(opts.professionalId, opts.from, opts.to);
  }

  const doctors = await listDoctors();
  const doctor = doctors.find((d) => d._id === opts.professionalId);
  if (!doctor) return [];

  const start = new Date(`${opts.from}T00:00:00.000Z`);
  const finish = new Date(`${opts.to}T23:59:00.000Z`);
  const turns = await listTurns(start.toISOString(), finish.toISOString());
  return computeFreeSlots({
    doctor,
    turns,
    from: opts.from,
    to: opts.to,
    timeZone: opts.timeZone || 'America/Argentina/Buenos_Aires',
  });
}
