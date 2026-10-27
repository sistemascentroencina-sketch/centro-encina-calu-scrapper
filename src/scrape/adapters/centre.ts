import { useLiveReads } from '../../config.js';
import type { Centre } from '../../domain/types.js';
import * as mock from '../../mock/data.js';
import { getCentre } from '../chedoc-client.js';

export async function getCentreInfo(): Promise<Centre> {
  if (!useLiveReads()) return { ...mock.centre };
  const c = await getCentre();
  return {
    id: c._id,
    name: (c.name || '').trim() || c._id,
  };
}
