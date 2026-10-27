/**
 * Lectura directa de la API CheDoc/Calu. Solo GET (y auth POST).
 * No crea ni modifica turnos/pacientes.
 */
import { config as loadEnv } from 'dotenv';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

loadEnv();

const API = 'https://api2.chedoc.com';
const email = process.env.CALU_EMAIL!;
const password = process.env.CALU_PASSWORD!;
const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', '.data', 'probe');
mkdirSync(outDir, { recursive: true });

async function main() {
  const authRes = await fetch(`${API}/api/auth/local`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!authRes.ok) throw new Error(`auth ${authRes.status}`);
  const auth = (await authRes.json()) as { token: string; roles: string[] };
  const token = auth.token;
  console.log('auth ok roles=', auth.roles);

  const headers = {
    authorization: `Bearer ${token}`,
    accept: 'application/json',
  };

  const meRes = await fetch(`${API}/api/users/me`, { headers });
  const me = await meRes.json();
  const centreId = me.centres?.[0]?._id || me.centres?.[0]?.id;
  console.log('centre', centreId, me.centres?.[0]?.name);

  async function get(path: string) {
    const res = await fetch(`${API}${path}`, { headers });
    const text = await res.text();
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      json = text;
    }
    const safeName = path.replace(/[^\w.-]+/g, '_').slice(0, 120);
    writeFileSync(join(outDir, `${safeName}.json`), JSON.stringify(json, null, 2));
    console.log('GET', path, '→', res.status, typeof json === 'object' && json
      ? Array.isArray(json)
        ? `array(${json.length})`
        : `keys=${Object.keys(json as object).slice(0, 8).join(',')}`
      : typeof json);
    return json;
  }

  const doctors = (await get(`/api/doctorCentres?centre=${centreId}`)) as any[];
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const finish = new Date(start);
  finish.setUTCDate(finish.getUTCDate() + 14);
  finish.setUTCHours(23, 59, 0, 0);
  const turns = (await get(
    `/api/turns?centre=${centreId}&start=${start.toISOString()}&finish=${finish.toISOString()}&selectedRole=centre`,
  )) as any[];

  // Sample turn keys (no PII dump to stdout)
  if (Array.isArray(turns) && turns[0]) {
    console.log('turn keys', Object.keys(turns[0]).sort().join(', '));
    const t = turns[0];
    console.log('sample turn meta', {
      id: t._id,
      start: t.start,
      finish: t.finish,
      status: t.status ?? t.state,
      doctor: t.doctorCentre?._id || t.doctorCentre || t.doctor,
      service: t.service?._id || t.service,
      hasPatient: Boolean(t.patientCentre),
    });
    // status distribution
    const dist: Record<string, number> = {};
    for (const x of turns) {
      const s = String(x.status ?? x.state ?? x.turnStatus ?? 'unknown');
      dist[s] = (dist[s] || 0) + 1;
    }
    console.log('status dist', dist);
    console.log('turns count', turns.length);
  }

  // doctors with workTimes
  const withWt = (doctors || []).filter((d) => (d.workTimes || []).length);
  console.log('doctors', doctors?.length, 'with workTimes', withWt.length);
  console.log(
    'doctors sample',
    (doctors || []).slice(0, 8).map((d) => ({
      id: d._id,
      name: `${d.firstname} ${d.lastname}`.trim(),
      services: (d.services || []).length,
      workTimes: (d.workTimes || []).length,
      onlineTurns: d.onlineTurns,
    })),
  );

  // patient search variants (read-only)
  for (const q of [
    `/api/patientCentres?centre=${centreId}&page=1&limit=5`,
    `/api/patientCentres?centre=${centreId}&search=28689964`,
    `/api/patientCentres?centre=${centreId}&dni=28689964`,
    `/api/patientCentres?centre=${centreId}&text=28689964`,
  ]) {
    await get(q);
  }

  // availability-ish endpoints (guess, safe GET)
  for (const q of [
    `/api/turns/available?centre=${centreId}&doctorCentre=${withWt[0]?._id || doctors?.[0]?._id}`,
    `/api/availableTurns?centre=${centreId}`,
    `/api/onlineTurns?centre=${centreId}`,
  ]) {
    const res = await fetch(`${API}${q}`, { headers });
    console.log('probe', q, '→', res.status);
  }

  writeFileSync(
    join(outDir, 'meta.json'),
    JSON.stringify(
      {
        centreId,
        doctorCount: doctors?.length,
        turnCount: Array.isArray(turns) ? turns.length : null,
        note: 'read-only probe; no mutations',
      },
      null,
      2,
    ),
  );
  console.log('CONFIRMADO: solo auth + GET; sin mutaciones de turnos/fichas.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
