/**
 * Smoke mock: fuerza MOCK=1 aunque .env tenga live.
 */
import { config as loadEnv } from 'dotenv';
loadEnv();
process.env.MOCK = '1';

const { buildApp } = await import('../src/app.js');

const app = buildApp();
const key = process.env.API_KEY || 'dev-local-key';

async function req(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (!path.endsWith('/health') && !path.includes('openapi') && !path.endsWith('/docs')) {
    headers.set('x-api-key', key);
  }
  if (init.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  const res = await app.request(path, { ...init, headers });
  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    /* keep text */
  }
  if (!res.ok) {
    throw new Error(`${init.method || 'GET'} ${path} → ${res.status} ${text}`);
  }
  return body;
}

async function main() {
  console.log('health', await req('/v1/health'));

  const openapi = await req('/v1/openapi.json');
  const paths = Object.keys((openapi as { paths: object }).paths || {});
  console.log('openapi paths', paths.length);
  if (paths.length < 14) throw new Error('openapi incompleto');

  const docs = await app.request('/v1/docs');
  if (docs.status !== 200 || !(await docs.text()).includes('swagger-ui')) {
    throw new Error('swagger ui no carga');
  }
  console.log('swagger ui ok');

  console.log('centre', await req('/v1/centre'));
  console.log('services', ((await req('/v1/services')) as { items: unknown[] }).items.length);

  const adm = (await req('/v1/professionals?kind=admission&bookable=true')) as {
    items: Array<{ id: string }>;
  };
  console.log('admission bookable', adm.items.length);

  const from = new Date();
  const to = new Date();
  to.setUTCDate(to.getUTCDate() + 14);
  const fromS = from.toISOString().slice(0, 10);
  const toS = to.toISOString().slice(0, 10);
  const slots = (await req(
    `/v1/slots?professionalId=pro-lucia&from=${fromS}&to=${toS}&timeZone=America/Argentina/Buenos_Aires`,
  )) as { slots: Array<{ id: string }> };
  console.log('slots', slots.slots.length);
  if (!slots.slots.length) throw new Error('sin slots mock');

  const created = (await req('/v1/appointments', {
    method: 'POST',
    body: JSON.stringify({
      patientId: 'pat-juan',
      professionalId: 'pro-lucia',
      slotId: slots.slots[0].id,
      type: 'session',
      markPaid: true,
      paymentRef: 'smoke-pay-1',
    }),
  })) as { id: string };
  console.log('created', created.id);

  const next = await req('/v1/appointments/next?patientId=pat-juan');
  console.log('next', (next as { appointment: { id: string } | null }).appointment?.id);

  const byId = await req(`/v1/patients/pat-juan`);
  console.log('patient by id', (byId as { dni: string }).dni);

  await req(`/v1/appointments/${created.id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason: 'smoke' }),
  });
  console.log('smoke-mock OK');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
