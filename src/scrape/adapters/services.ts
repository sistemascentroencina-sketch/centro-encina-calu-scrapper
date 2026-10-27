import { useLiveReads } from '../../config.js';
import type { Service } from '../../domain/types.js';
import { listServices as listCheDocServices } from '../chedoc-client.js';

const mockServices: Service[] = [
  { id: 'svc-admision', name: 'adminisión', durationMinutes: 10, available: true, type: 'practice' },
  { id: 'svc-30', name: 'consulta 30 minutos', durationMinutes: 30, available: true, type: 'practice' },
  { id: 'svc-40', name: 'consulta 40 minutos', durationMinutes: 40, available: true, type: 'practice' },
  { id: 'svc-60', name: 'consulta 60 minutos', durationMinutes: 60, available: true, type: 'practice' },
];

export async function listServices(): Promise<Service[]> {
  if (!useLiveReads()) return mockServices;
  const raw = await listCheDocServices();
  return raw
    .filter((s) => s.available !== false)
    .map((s) => ({
      id: s._id,
      name: (s.name || '').trim() || s._id,
      durationMinutes: s.duration && s.duration > 0 ? s.duration : 40,
      available: s.available !== false,
      type: s.type,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
}
