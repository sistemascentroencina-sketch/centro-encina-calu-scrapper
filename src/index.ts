import { serve } from '@hono/node-server';
import { buildApp } from './app.js';
import { caluCredentialsReady, config } from './config.js';
import { credentialsNeededMessage } from './auth/calu-session.js';

const app = buildApp();

serve({ fetch: app.fetch, port: config.port }, (info) => {
  const base = `http://localhost:${info.port}`;
  console.log('');
  console.log('calu-bot listo');
  console.log(`  API     ${base}/v1/health`);
  console.log(`  Swagger ${base}/v1/docs`);
  console.log(`  OpenAPI ${base}/v1/openapi.json`);
  console.log(`  mode=${config.mock ? 'mock' : 'live'} writes=${config.allowWrites} caluCreds=${caluCredentialsReady()}`);
  console.log('');
  if (!config.mock && !caluCredentialsReady()) {
    console.warn(credentialsNeededMessage());
  }
});
