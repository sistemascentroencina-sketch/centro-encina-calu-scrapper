import { config as loadEnv } from 'dotenv';

loadEnv();

function env(name: string, fallback = ''): string {
  return process.env[name]?.trim() || fallback;
}

export const config = {
  port: Number(env('PORT', '8787')),
  /** MOCK=1 fuerza datos demo; MOCK=0 usa API Calu/CheDoc cuando hay credenciales */
  mock: env('MOCK', '1') !== '0',
  apiKey: env('API_KEY', 'dev-local-key'),
  calu: {
    /** UI login (informativo) */
    baseUrl: env('CALU_BASE_URL'),
    /** API real detrás de citas.calu.app */
    apiBase: env('CALU_API_BASE', 'https://api2.chedoc.com'),
    email: env('CALU_EMAIL'),
    password: env('CALU_PASSWORD'),
    /** Si vacío, se resuelve vía /api/users/me */
    centreId: env('CALU_CENTRE_ID'),
  },
  /** En live, mutaciones quedan bloqueadas por seguridad (prod) */
  allowWrites: env('CALU_ALLOW_WRITES', '0') === '1',
};

export function caluCredentialsReady(): boolean {
  return Boolean(config.calu.apiBase && config.calu.email && config.calu.password);
}

export function useLiveReads(): boolean {
  return !config.mock && caluCredentialsReady();
}
