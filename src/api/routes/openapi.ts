import { Hono } from 'hono';
import { openApiDocument } from '../../openapi/spec.js';

export const openApiRoutes = new Hono();

openApiRoutes.get('/openapi.json', (c) => c.json(openApiDocument));
