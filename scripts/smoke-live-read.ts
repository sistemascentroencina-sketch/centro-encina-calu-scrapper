/**
 * Smoke SOLO LECTURA contra Calu/CheDoc.
 * No crea, cancela ni modifica turnos.
 */
import { config as loadEnv } from 'dotenv';
loadEnv();
process.env.MOCK = '0';

const { buildApp } = await import('../src/app.js');
const { listDoctors } = await import('../src/scrape/chedoc-client.js');

const app = buildApp();
const key = process.env.API_KEY || 'dev-local-key';

async function req(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (
    !path.endsWith('/health') &&
    !path.includes('openapi') &&
    !path.endsWith('/docs')
  ) {
    headers.set('x-api-key', key);
  }
  if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
  const res = await app.request(path, { ...init, headers });
  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    /* keep */
  }
  return { status: res.status, body };
}

async function main() {
  const health = await req('/v1/health');
  console.log('health', health.body);
  if (health.status !== 200) throw new Error('health fail');

  const openapi = await req('/v1/openapi.json');
  console.log(
    'openapi',
    openapi.status,
    'paths',
    Object.keys((openapi.body as { paths: object }).paths || {}).length,
  );

  const docs = await app.request('/v1/docs');
  console.log('swagger', docs.status);

  const centre = await req('/v1/centre');
  console.log('centre', centre.status, (centre.body as { name?: string }).name);

  const admBookable = await req('/v1/professionals?kind=admission&bookable=true');
  console.log(
    'admission bookable',
    ((admBookable.body as { items: unknown[] }).items || []).length,
  );

  const doctors = await listDoctors();
  const withWt = doctors.find((d) => (d.workTimes || []).length > 0);
  if (!withWt) throw new Error('ningún doctor con workTimes');

  const from = new Date();
  const to = new Date();
  to.setUTCDate(to.getUTCDate() + 21);
  const fromS = from.toISOString().slice(0, 10);
  const toS = to.toISOString().slice(0, 10);
  const slotsRes = await req(
    `/v1/slots?professionalId=${withWt._id}&from=${fromS}&to=${toS}&timeZone=America/Argentina/Buenos_Aires`,
  );
  console.log('slots', slotsRes.status, ((slotsRes.body as { slots: unknown[] }).slots || []).length);

  const dni = '28689964';
  const patientRes = await req(`/v1/patients/by-dni/${dni}`);
  console.log('patient by dni', patientRes.status);
  if (patientRes.status === 200) {
    const p = patientRes.body as { id: string };
    const byId = await req(`/v1/patients/${p.id}`);
    console.log('patient by id', byId.status);
    const appts = await req(`/v1/appointments?patientId=${p.id}&scope=upcoming`);
    console.log('upcoming', ((appts.body as { items: unknown[] }).items || []).length);
    const next = await req(`/v1/appointments/next?patientId=${p.id}`);
    console.log('next', next.status, Boolean((next.body as { appointment: unknown }).appointment));
  }

  const cancel = await req('/v1/appointments/fake-id/cancel', { method: 'POST', body: '{}' });
  if (cancel.status !== 403) throw new Error('se esperaba 403 WRITE_DISABLED en cancel');
  console.log('cancel blocked 403 OK');

  const create = await req('/v1/appointments', {
    method: 'POST',
    body: JSON.stringify({
      patientId: 'x',
      professionalId: withWt._id,
      slotId: 'x',
      type: 'session',
    }),
  });
  if (create.status !== 403) throw new Error('se esperaba 403 WRITE_DISABLED en create');
  console.log('create blocked 403 OK');

  console.log('smoke-live-read OK');
  console.log('CONFIRMADO: no se crearon/modificaron/cancelaron turnos reales.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
