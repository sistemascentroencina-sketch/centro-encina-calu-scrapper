/**
 * Solo lectura: login + captura de red/DOM. NO crea ni modifica turnos.
 */
import { config as loadEnv } from 'dotenv';
import { chromium, type Request, type Response } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

loadEnv();

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', '.data', 'discover');
mkdirSync(outDir, { recursive: true });

const baseUrl = process.env.CALU_BASE_URL!;
const email = process.env.CALU_EMAIL!;
const password = process.env.CALU_PASSWORD!;

if (!baseUrl || !email || !password) {
  console.error('Faltan CALU_* en .env');
  process.exit(1);
}

type NetHit = {
  method: string;
  url: string;
  status?: number;
  resourceType: string;
  requestHeaders?: Record<string, string>;
  postData?: string;
  responseBodyPreview?: string;
  contentType?: string;
};

const hits: NetHit[] = [];
const interesting = (url: string) =>
  /calu\.app|graphql|api|agenda|turno|cita|paciente|profesional|disponib|slot|auth|session|login/i.test(
    url,
  );

function redact(s: string): string {
  return s
    .replace(password, '[REDACTED]')
    .replace(email, '[EMAIL]')
    .replace(/("password"\s*:\s*")[^"]+"/gi, '$1[REDACTED]"')
    .replace(/(password=)[^&\s]+/gi, '$1[REDACTED]');
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: 'es-AR',
  });
  const page = await context.newPage();

  page.on('request', (req: Request) => {
    const url = req.url();
    if (!interesting(url)) return;
    if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) return;
    hits.push({
      method: req.method(),
      url,
      resourceType: req.resourceType(),
      postData: req.postData() ? redact(req.postData()!.slice(0, 4000)) : undefined,
    });
  });

  page.on('response', async (res: Response) => {
    const url = res.url();
    if (!interesting(url)) return;
    if (['image', 'stylesheet', 'font', 'media'].includes(res.request().resourceType())) return;
    const hit =
      hits.find((h) => h.url === url && h.method === res.request().method() && !h.status) ||
      hits[hits.length - 1];
    const ct = res.headers()['content-type'] || '';
    let preview = '';
    try {
      if (/json|text|javascript|xml/i.test(ct)) {
        const t = await res.text();
        preview = redact(t.slice(0, 6000));
      }
    } catch {
      /* ignore */
    }
    if (hit && hit.url === url) {
      hit.status = res.status();
      hit.contentType = ct;
      hit.responseBodyPreview = preview || undefined;
      hit.requestHeaders = Object.fromEntries(
        Object.entries(res.request().headers()).filter(([k]) =>
          /cookie|auth|x-|content-type|accept|origin|referer/i.test(k),
        ),
      );
    }
  });

  console.log('→ goto login');
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 60000 });
  await page.screenshot({ path: join(outDir, '01-login.png'), fullPage: true });
  writeFileSync(join(outDir, '01-login.html'), await page.content());

  // Heurística de campos
  const emailSel = [
    'input[type="email"]',
    'input[name*="mail" i]',
    'input[name*="usuario" i]',
    'input[name*="user" i]',
    'input[placeholder*="mail" i]',
    'input[placeholder*="correo" i]',
    'input[type="text"]',
  ];
  const passSel = ['input[type="password"]', 'input[name*="pass" i]'];

  let emailInput = null as Awaited<ReturnType<typeof page.$>>;
  for (const s of emailSel) {
    emailInput = await page.$(s);
    if (emailInput) break;
  }
  let passInput = null as Awaited<ReturnType<typeof page.$>>;
  for (const s of passSel) {
    passInput = await page.$(s);
    if (passInput) break;
  }

  if (!emailInput || !passInput) {
    console.error('No encontré inputs de login');
    writeFileSync(join(outDir, 'network.json'), JSON.stringify(hits, null, 2));
    await browser.close();
    process.exit(2);
  }

  await emailInput.fill(email);
  await passInput.fill(password);

  const submit =
    (await page.$('button[type="submit"]')) ||
    (await page.$('button:has-text("Ingresar")')) ||
    (await page.$('button:has-text("Entrar")')) ||
    (await page.$('input[type="submit"]'));

  console.log('→ submit login');
  if (submit) await submit.click();
  else await passInput.press('Enter');

  await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(2500);
  await page.screenshot({ path: join(outDir, '02-after-login.png'), fullPage: true });
  writeFileSync(join(outDir, '02-after-login.html'), await page.content());
  console.log('URL post-login:', page.url());

  // Guardar storage state (cookies) sin password
  await context.storageState({ path: join(outDir, 'storage-state.json') });

  // Intentar navegar menús comunes (solo lectura)
  const linkTexts = [
    'Agenda',
    'Agendas',
    'Turnos',
    'Citas',
    'Pacientes',
    'Profesionales',
    'Calendario',
    'Inicio',
    'Disponibilidad',
  ];
  for (const text of linkTexts) {
    const el = page.getByRole('link', { name: new RegExp(text, 'i') }).first();
    if (await el.count()) {
      console.log('→ click link', text);
      await el.click({ timeout: 5000 }).catch(() => {});
      await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(1000);
      const safe = text.toLowerCase().replace(/\s+/g, '-');
      await page.screenshot({ path: join(outDir, `nav-${safe}.png`), fullPage: true }).catch(() => {});
      writeFileSync(join(outDir, `nav-${safe}.html`), await page.content());
      console.log('  url', page.url());
    }
  }

  // También botones/nav items
  for (const text of ['Agenda', 'Turnos', 'Pacientes']) {
    const btn = page.getByRole('button', { name: new RegExp(text, 'i') }).first();
    if (await btn.count()) {
      console.log('→ click button', text);
      await btn.click({ timeout: 5000 }).catch(() => {});
      await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(1000);
    }
  }

  // Extraer links del DOM
  const anchors = await page.$$eval('a[href]', (as) =>
    as.slice(0, 200).map((a) => ({ href: (a as HTMLAnchorElement).href, text: (a.textContent || '').trim().slice(0, 80) })),
  );
  writeFileSync(join(outDir, 'anchors.json'), JSON.stringify(anchors, null, 2));

  // Deduplicar hits por method+url
  const uniq = new Map<string, NetHit>();
  for (const h of hits) {
    const k = `${h.method} ${h.url}`;
    if (!uniq.has(k) || (h.responseBodyPreview && !uniq.get(k)!.responseBodyPreview)) {
      uniq.set(k, h);
    }
  }
  const list = [...uniq.values()].sort((a, b) => a.url.localeCompare(b.url));
  writeFileSync(join(outDir, 'network.json'), JSON.stringify(list, null, 2));

  // Resumen XHR JSON
  const apiish = list.filter(
    (h) =>
      h.method !== 'GET' ||
      /api|graphql|json|turno|cita|agenda|paciente|profesional|disponib/i.test(h.url) ||
      (h.contentType || '').includes('json'),
  );
  writeFileSync(
    join(outDir, 'summary.json'),
    JSON.stringify(
      {
        finalUrl: page.url(),
        title: await page.title(),
        apiishCount: apiish.length,
        apiish: apiish.map((h) => ({
          method: h.method,
          status: h.status,
          url: h.url,
          contentType: h.contentType,
          hasBody: Boolean(h.responseBodyPreview),
        })),
      },
      null,
      2,
    ),
  );

  console.log('Hallazgos API-ish:', apiish.length);
  for (const h of apiish.slice(0, 40)) {
    console.log(`  ${h.method} ${h.status ?? '-'} ${h.url}`);
  }

  await browser.close();
  console.log('OK discover →', outDir);
  console.log('CONFIRMADO: no se crearon/modificaron/cancelaron turnos (solo login + navegación lectura).');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
