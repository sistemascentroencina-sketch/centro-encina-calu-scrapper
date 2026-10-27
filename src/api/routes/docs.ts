import { Hono } from 'hono';

export const docsRoutes = new Hono();

/** Swagger UI local — abrir http://localhost:8787/v1/docs */
docsRoutes.get('/docs', (c) => {
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>calu-bot — API docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui.css" />
  <style>
    body { margin: 0; background: #faf9f6; }
    .topbar { display: none; }
    .ce-banner {
      font-family: ui-sans-serif, system-ui, sans-serif;
      padding: 1rem 1.25rem;
      background: #1c2420;
      color: #f5f2ea;
    }
    .ce-banner h1 { margin: 0 0 .35rem; font-size: 1.15rem; font-weight: 600; }
    .ce-banner p { margin: 0; font-size: .9rem; opacity: .85; line-height: 1.4; }
    .ce-banner code {
      background: rgba(255,255,255,.12); padding: .1rem .35rem; border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="ce-banner">
    <h1>calu-bot · Centro Encina</h1>
    <p>
      Spec: <code>/v1/openapi.json</code> ·
      Auth: botón <strong>Authorize</strong> → header <code>X-Api-Key</code>
      (valor de <code>API_KEY</code> en <code>.env</code>, default <code>dev-local-key</code>).
      Mutaciones en live responden <code>403 WRITE_DISABLED</code>.
    </p>
  </div>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-bundle.js" crossorigin></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-standalone-preset.js" crossorigin></script>
  <script>
    window.ui = SwaggerUIBundle({
      url: '/v1/openapi.json',
      dom_id: '#swagger-ui',
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
      layout: 'StandaloneLayout',
      deepLinking: true,
      tryItOutEnabled: true,
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      defaultModelsExpandDepth: 1,
      defaultModelExpandDepth: 2,
      onComplete: function () {
        try {
          window.ui.preauthorizeApiKey('ApiKeyAuth', 'dev-local-key');
        } catch (e) {}
      },
    });
  </script>
</body>
</html>`;
  return c.html(html);
});
