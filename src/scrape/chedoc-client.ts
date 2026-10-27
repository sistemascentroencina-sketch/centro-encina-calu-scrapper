import { loginCalu } from '../auth/calu-session.js';
import { cacheGet, cacheSet } from '../cache/ttl.js';
import { config } from '../config.js';

const TTL_DOCTORS_MS = 60_000;
const TTL_TURNS_MS = 30_000;
const TTL_SERVICES_MS = 120_000;
const TTL_CENTRE_MS = 300_000;

async function authHeaders(): Promise<{ headers: Record<string, string>; centreId: string }> {
  const { token, centreId } = await loginCalu();
  return {
    centreId,
    headers: {
      authorization: `Bearer ${token}`,
      accept: 'application/json',
    },
  };
}

async function getJson<T>(path: string, retried = false): Promise<T> {
  const { headers } = await authHeaders();
  const res = await fetch(`${config.calu.apiBase}${path}`, { headers });
  if ((res.status === 401 || res.status === 403) && !retried) {
    // forzar re-login
    const { writeFileSync, mkdirSync } = await import('node:fs');
    const { join } = await import('node:path');
    mkdirSync(join(process.cwd(), '.data'), { recursive: true });
    writeFileSync(join(process.cwd(), '.data', 'token-cache.json'), '{}');
    await loginCalu();
    return getJson<T>(path, true);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`CheDoc GET ${path} → ${res.status} ${text.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

export type CheDocDoctor = {
  _id: string;
  firstname?: string;
  lastname?: string;
  email?: string;
  available?: boolean;
  onlineTurns?: boolean;
  services?: string[];
  specialities?: Array<{ name?: string }>;
  workTimes?: Array<{
    weekDay?: { name?: string; code?: number };
    startTime?: string;
    finishTime?: string;
    turnDuration?: number;
    consultation?: boolean;
    onlineTurns?: boolean;
    noWorkTimes?: unknown;
  }>;
  noWorkTimes?: Array<{
    description?: string;
    startDate?: string;
    finishDate?: string;
  }>;
};

export type CheDocPatient = {
  _id: string;
  id?: string;
  dni?: string;
  firstname?: string;
  lastname?: string;
  email?: string;
  mobile?: number | string;
  available?: boolean;
  timeZone?: string;
};

export type CheDocTurn = {
  _id: string;
  id?: string;
  startHour?: string;
  finishHour?: string;
  state?: string;
  doctorCentre?: string | { _id?: string };
  doctorName?: string;
  patientCentre?: string | { _id?: string; dni?: string; firstname?: string; lastname?: string };
  patientName?: string;
  dni?: string;
  firstTime?: boolean;
  consultationDuration?: number;
  service?: string | { _id?: string; name?: string } | null;
  available?: boolean;
};

export async function getCentreId(): Promise<string> {
  const { centreId } = await authHeaders();
  return centreId;
}

export async function listDoctors(): Promise<CheDocDoctor[]> {
  const centreId = await getCentreId();
  const key = `doctors:${centreId}`;
  const cached = cacheGet<CheDocDoctor[]>(key);
  if (cached) return cached;
  const data = await getJson<CheDocDoctor[]>(`/api/doctorCentres?centre=${centreId}`);
  cacheSet(key, data, TTL_DOCTORS_MS);
  return data;
}

export async function listTurns(startIso: string, finishIso: string): Promise<CheDocTurn[]> {
  const centreId = await getCentreId();
  const key = `turns:${centreId}:${startIso}:${finishIso}`;
  const cached = cacheGet<CheDocTurn[]>(key);
  if (cached) return cached;
  const q = new URLSearchParams({
    centre: centreId,
    start: startIso,
    finish: finishIso,
    selectedRole: 'centre',
  });
  const data = await getJson<CheDocTurn[]>(`/api/turns?${q}`);
  cacheSet(key, data, TTL_TURNS_MS);
  return data;
}

export type CheDocCentre = {
  _id: string;
  name?: string;
};

export async function getCentre(): Promise<CheDocCentre> {
  const centreId = await getCentreId();
  const key = `centre:${centreId}`;
  const cached = cacheGet<CheDocCentre>(key);
  if (cached) return cached;
  const data = await getJson<CheDocCentre>(`/api/centres/${centreId}`);
  cacheSet(key, data, TTL_CENTRE_MS);
  return data;
}

export async function findPatientByDni(dni: string): Promise<CheDocPatient | null> {
  const centreId = await getCentreId();
  const q = new URLSearchParams({ centre: centreId, dni, limit: '5' });
  const page = await getJson<{ docs: CheDocPatient[] }>(`/api/patientCentres?${q}`);
  if (page.docs?.length) return page.docs[0];
  const q2 = new URLSearchParams({ centre: centreId, search: dni, limit: '5' });
  const page2 = await getJson<{ docs: CheDocPatient[] }>(`/api/patientCentres?${q2}`);
  return page2.docs?.[0] ?? null;
}

export async function getPatientById(id: string): Promise<CheDocPatient | null> {
  const centreId = await getCentreId();
  // listado filtrado: a veces existe GET por id
  try {
    return await getJson<CheDocPatient>(`/api/patientCentres/${id}`);
  } catch {
    const q = new URLSearchParams({ centre: centreId, search: id, limit: '20' });
    const page = await getJson<{ docs: CheDocPatient[] }>(`/api/patientCentres?${q}`);
    return page.docs?.find((d) => d._id === id || d.id === id) ?? null;
  }
}

export type CheDocService = {
  _id: string;
  name?: string;
  duration?: number;
  available?: boolean;
  type?: string;
};

export async function listServices(): Promise<CheDocService[]> {
  const centreId = await getCentreId();
  const key = `services:${centreId}`;
  const cached = cacheGet<CheDocService[]>(key);
  if (cached) return cached;
  const data = await getJson<CheDocService[]>(`/api/services?centre=${centreId}`);
  cacheSet(key, data, TTL_SERVICES_MS);
  return data;
}

/** Busca un turno por id en una ventana amplia (solo lectura). */
export async function findTurnById(id: string): Promise<CheDocTurn | null> {
  const start = new Date();
  start.setUTCFullYear(start.getUTCFullYear() - 1);
  start.setUTCHours(0, 0, 0, 0);
  const finish = new Date();
  finish.setUTCFullYear(finish.getUTCFullYear() + 1);
  finish.setUTCHours(23, 59, 0, 0);
  const turns = await listTurns(start.toISOString(), finish.toISOString());
  return turns.find((t) => t._id === id || t.id === id) ?? null;
}
