import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { caluCredentialsReady, config, useLiveReads } from '../config.js';

export type CaluSessionStatus = 'ok' | 'missing' | 'error' | 'mock';

const tokenPath = join(process.cwd(), '.data', 'token-cache.json');

type TokenCache = {
  token: string;
  obtainedAt: number;
  centreId?: string;
};

function readCache(): TokenCache | null {
  try {
    if (!existsSync(tokenPath)) return null;
    return JSON.parse(readFileSync(tokenPath, 'utf8')) as TokenCache;
  } catch {
    return null;
  }
}

function writeCache(cache: TokenCache) {
  mkdirSync(join(process.cwd(), '.data'), { recursive: true });
  writeFileSync(tokenPath, JSON.stringify(cache), 'utf8');
}

/** JWT tipicamente ~2.5 días en el payload visto; renovamos a las 12h */
function cacheFresh(cache: TokenCache | null): boolean {
  if (!cache?.token) return false;
  return Date.now() - cache.obtainedAt < 12 * 60 * 60 * 1000;
}

export async function loginCalu(): Promise<{ token: string; centreId: string }> {
  if (!caluCredentialsReady()) {
    throw new Error('Credenciales Calu incompletas');
  }

  const cached = readCache();
  if (cacheFresh(cached) && cached!.centreId) {
    return { token: cached!.token, centreId: cached!.centreId };
  }

  const res = await fetch(`${config.calu.apiBase}/api/auth/local`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      email: config.calu.email,
      password: config.calu.password,
    }),
  });
  if (!res.ok) {
    throw new Error(`Calu auth falló: HTTP ${res.status}`);
  }
  const body = (await res.json()) as { token?: string };
  if (!body.token) throw new Error('Calu auth sin token');

  let centreId = config.calu.centreId;
  if (!centreId) {
    const meRes = await fetch(`${config.calu.apiBase}/api/users/me`, {
      headers: { authorization: `Bearer ${body.token}`, accept: 'application/json' },
    });
    if (!meRes.ok) throw new Error(`users/me falló: HTTP ${meRes.status}`);
    const me = (await meRes.json()) as { centres?: Array<{ _id?: string; id?: string }> };
    centreId = me.centres?.[0]?._id || me.centres?.[0]?.id || '';
  }
  if (!centreId) throw new Error('No se pudo resolver centreId');

  writeCache({ token: body.token, obtainedAt: Date.now(), centreId });
  return { token: body.token, centreId };
}

export async function getCaluSessionStatus(): Promise<CaluSessionStatus> {
  if (config.mock) return 'mock';
  if (!caluCredentialsReady()) return 'missing';
  try {
    await loginCalu();
    return 'ok';
  } catch {
    return 'error';
  }
}

export function credentialsNeededMessage(): string {
  return [
    'Para scrape/API live de Calu se necesita en .env:',
    '- CALU_BASE_URL (UI)',
    '- CALU_EMAIL',
    '- CALU_PASSWORD',
    '- opcional CALU_API_BASE (default https://api2.chedoc.com)',
    '- opcional CALU_CENTRE_ID',
  ].join('\n');
}

export function assertLiveMode(): void {
  if (!useLiveReads()) {
    throw new Error('Live mode no activo');
  }
}
