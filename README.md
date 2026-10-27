# calu-bot

Bridge **Calu / CheDoc → app paciente Centro Encina**.

Expone APIs `/v1/*` con datos **mock** o **lecturas live** (prod Calu en solo lectura).

## Ver Swagger en local (lo más importante)

```bash
cd calu-bot
cp .env.example .env   # opcional: dejar MOCK=1 para demo sin Calu
npm install
npm start
```

Abrí en el navegador:

| Qué | URL |
|-----|-----|
| **Swagger UI** | http://localhost:8787/v1/docs |
| OpenAPI JSON | http://localhost:8787/v1/openapi.json |
| Health | http://localhost:8787/v1/health |

También: `http://localhost:8787/docs` → redirige a `/v1/docs`.

En Swagger: **Authorize** → `X-Api-Key` = valor de `API_KEY` en `.env` (default `dev-local-key`). La UI intenta prellenar `dev-local-key`.

Alias: `npm run docs` = mismo que `npm start`.

## Modos

| Variable | Efecto |
|----------|--------|
| `MOCK=1` | Datos demo (sin Calu) |
| `MOCK=0` | Lecturas reales `api2.chedoc.com` (requiere `CALU_*` en `.env` local) |
| `CALU_ALLOW_WRITES=0` | **Default.** Create/cancel/reschedule/alta paciente → `403 WRITE_DISABLED` |

Secretos **solo** en `.env` local (gitignored). Nunca en el repo.

## APIs MVP paciente (`/v1`)

| Método | Path | Notas |
|--------|------|--------|
| GET | `/health` | público |
| GET | `/docs` | Swagger UI (público) |
| GET | `/openapi.json` | OpenAPI (público) |
| GET | `/centre` | id + nombre centro |
| GET | `/patients/by-dni/:dni` | ficha + profesional asignado / isFirstVisit |
| GET | `/patients/:id` | ficha por id |
| POST | `/patients` | mock OK; live gated |
| GET | `/professionals` | `?kind=admission\|clinical` · `?bookable=true` |
| GET | `/professionals/:id` | detalle |
| GET | `/services` | catálogo |
| GET | `/slots` | `professionalId`, `from`, `to`, `timeZone?` |
| GET | `/appointments` | `patientId`, `scope`, `type?` |
| GET | `/appointments/next` | próximo turno (home) |
| GET | `/appointments/:id` | detalle |
| POST | `/appointments` | mock; live gated |
| POST | `/appointments/:id/reschedule` | mock; live gated |
| POST | `/appointments/:id/cancel` | mock; live gated |

Auth: header `X-Api-Key` (excepto health/docs/openapi).

## Smoke

```bash
npm run smoke:mock        # fuerza MOCK=1
npm run smoke:live-read   # MOCK=0 + .env real; solo lectura; verifica 403 en writes
```

## Scripts extra

- `discover:calu` / `probe:api` — exploración solo lectura (no mutan turnos)
- Spec fuente: `src/openapi/spec.ts`
