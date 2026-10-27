import { useLiveReads } from '../../config.js';
import { HttpError } from '../../domain/errors.js';
import type { Professional } from '../../domain/types.js';
import * as mock from '../../mock/data.js';
import { listDoctors } from '../chedoc-client.js';
import { mapDoctor } from '../mappers.js';

export async function listProfessionals(opts?: {
  kind?: 'clinical' | 'admission';
  bookable?: boolean;
}): Promise<Professional[]> {
  let items: Professional[];
  if (!useLiveReads()) {
    items = [...mock.professionals];
  } else {
    const doctors = await listDoctors();
    items = doctors
      .filter((d) => d.available !== false)
      .map(mapDoctor)
      .sort((a, b) => a.displayName.localeCompare(b.displayName, 'es'));
  }
  if (opts?.kind) items = items.filter((p) => p.kind === opts.kind);
  if (opts?.bookable === true) items = items.filter((p) => p.bookable);
  if (opts?.bookable === false) items = items.filter((p) => !p.bookable);
  return items;
}

export async function getProfessional(id: string): Promise<Professional | null> {
  if (!useLiveReads()) {
    return mock.professionals.find((p) => p.id === id) ?? null;
  }
  const doctors = await listDoctors();
  const d = doctors.find((x) => x._id === id);
  return d ? mapDoctor(d) : null;
}

export async function requireProfessional(id: string): Promise<Professional> {
  const p = await getProfessional(id);
  if (!p) throw new HttpError(404, 'Profesional no encontrado', 'PRO_NOT_FOUND');
  return p;
}
