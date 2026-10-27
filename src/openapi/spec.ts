/** OpenAPI 3.1 — contratos /v1 de calu-bot */
export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'calu-bot API',
    version: '0.2.0',
    description:
      'Bridge Calu/CheDoc → app paciente Centro Encina.\n\n' +
      '**Local:** `cd calu-bot && npm start` → abrir http://localhost:8787/v1/docs\n\n' +
      'Auth: header `X-Api-Key` (default `dev-local-key`). ' +
      'Mutaciones en live requieren `CALU_ALLOW_WRITES=1` (deshabilitado en prod).',
  },
  servers: [{ url: 'http://localhost:8787', description: 'local' }],
  tags: [
    { name: 'health' },
    { name: 'centre' },
    { name: 'patients' },
    { name: 'professionals' },
    { name: 'services' },
    { name: 'slots' },
    { name: 'appointments' },
    { name: 'docs' },
  ],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-Api-Key',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          code: { type: 'string' },
        },
        required: ['error'],
      },
      Health: {
        type: 'object',
        properties: {
          ok: { type: 'boolean' },
          mode: { type: 'string', enum: ['mock', 'live'] },
          caluSession: { type: 'string', enum: ['ok', 'missing', 'error', 'mock'] },
          writesEnabled: { type: 'boolean' },
        },
        required: ['ok', 'mode', 'caluSession', 'writesEnabled'],
      },
      Centre: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
        },
        required: ['id', 'name'],
      },
      Patient: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          dni: { type: 'string' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          timeZone: { type: 'string' },
          assignedProfessionalId: { type: ['string', 'null'] },
          isFirstVisit: { type: 'boolean' },
          phone: { type: 'string' },
          email: { type: 'string' },
        },
        required: ['id', 'dni', 'firstName', 'lastName', 'timeZone', 'isFirstVisit'],
      },
      Professional: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          displayName: { type: 'string' },
          title: { type: 'string' },
          focus: { type: 'string' },
          kind: { type: 'string', enum: ['clinical', 'admission'] },
          bookable: {
            type: 'boolean',
            description: 'true si tiene workTimes y puede generar slots',
          },
        },
        required: ['id', 'displayName', 'kind', 'bookable'],
      },
      Service: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          durationMinutes: { type: 'integer' },
          available: { type: 'boolean' },
          type: { type: 'string' },
        },
        required: ['id', 'name', 'durationMinutes', 'available'],
      },
      Slot: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          startsAt: { type: 'string', format: 'date-time' },
          endsAt: { type: 'string', format: 'date-time' },
          localLabel: { type: 'string' },
          dateLocal: { type: 'string', format: 'date' },
        },
        required: ['id', 'startsAt', 'endsAt', 'localLabel', 'dateLocal'],
      },
      Appointment: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          patientId: { type: 'string' },
          professionalId: { type: 'string' },
          professionalName: { type: 'string' },
          type: { type: 'string', enum: ['admission', 'session'] },
          startsAt: { type: 'string', format: 'date-time' },
          endsAt: { type: 'string', format: 'date-time' },
          status: {
            type: 'string',
            enum: [
              'pending_confirm',
              'paid',
              'confirmed',
              'rejected',
              'cancelled',
              'completed',
            ],
          },
          timeZone: { type: 'string' },
          paymentRef: { type: 'string' },
        },
        required: [
          'id',
          'patientId',
          'professionalId',
          'type',
          'startsAt',
          'endsAt',
          'status',
        ],
      },
    },
  },
  paths: {
    '/v1/health': {
      get: {
        tags: ['health'],
        summary: 'Health check',
        security: [],
        responses: {
          '200': {
            description: 'OK',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Health' } } },
          },
        },
      },
    },
    '/v1/openapi.json': {
      get: {
        tags: ['docs'],
        summary: 'OpenAPI document',
        security: [],
        responses: { '200': { description: 'OpenAPI JSON' } },
      },
    },
    '/v1/docs': {
      get: {
        tags: ['docs'],
        summary: 'Swagger UI',
        security: [],
        responses: { '200': { description: 'HTML Swagger UI' } },
      },
    },
    '/v1/centre': {
      get: {
        tags: ['centre'],
        summary: 'Centro actual (id + nombre)',
        security: [{ ApiKeyAuth: [] }],
        responses: {
          '200': {
            description: 'OK',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Centre' } } },
          },
        },
      },
    },
    '/v1/patients/by-dni/{dni}': {
      get: {
        tags: ['patients'],
        summary: 'Buscar paciente por DNI',
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          { name: 'dni', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Paciente',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Patient' } } },
          },
          '404': {
            description: 'No encontrado',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/v1/patients/{id}': {
      get: {
        tags: ['patients'],
        summary: 'Paciente por id Calu',
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Paciente',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Patient' } } },
          },
          '404': {
            description: 'No encontrado',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/v1/patients': {
      post: {
        tags: ['patients'],
        summary: 'Alta / upsert paciente (mock; live gated WRITE_DISABLED)',
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['dni', 'firstName', 'lastName', 'timeZone'],
                properties: {
                  dni: { type: 'string' },
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  timeZone: { type: 'string' },
                  phone: { type: 'string' },
                  email: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Creado o existente',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Patient' } } },
          },
          '403': {
            description: 'WRITE_DISABLED en live',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/v1/professionals': {
      get: {
        tags: ['professionals'],
        summary: 'Listar profesionales / agendas',
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          {
            name: 'kind',
            in: 'query',
            required: false,
            description: 'Filtrar admisión vs clínico',
            schema: { type: 'string', enum: ['clinical', 'admission'] },
          },
          {
            name: 'bookable',
            in: 'query',
            required: false,
            description: 'true = solo agendas con workTimes (útiles para slots)',
            schema: { type: 'boolean' },
          },
        ],
        responses: {
          '200': {
            description: 'Lista',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    items: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Professional' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/v1/professionals/{id}': {
      get: {
        tags: ['professionals'],
        summary: 'Detalle profesional',
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Professional' } },
            },
          },
          '404': {
            description: 'No encontrado',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/v1/services': {
      get: {
        tags: ['services'],
        summary: 'Catálogo de servicios Calu (admision, consulta, …)',
        security: [{ ApiKeyAuth: [] }],
        responses: {
          '200': {
            description: 'Lista',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    items: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Service' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/v1/slots': {
      get: {
        tags: ['slots'],
        summary: 'Slots libres (workTimes − turnos ocupados)',
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          { name: 'professionalId', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'from', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
          { name: 'to', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
          { name: 'timeZone', in: 'query', required: false, schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Slots',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    professionalId: { type: 'string' },
                    slots: { type: 'array', items: { $ref: '#/components/schemas/Slot' } },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/v1/appointments/next': {
      get: {
        tags: ['appointments'],
        summary: 'Próximo turno del paciente (home)',
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          { name: 'patientId', in: 'query', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'appointment o null',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    appointment: {
                      oneOf: [
                        { $ref: '#/components/schemas/Appointment' },
                        { type: 'null' },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/v1/appointments': {
      get: {
        tags: ['appointments'],
        summary: 'Listar turnos de un paciente',
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          { name: 'patientId', in: 'query', required: true, schema: { type: 'string' } },
          {
            name: 'scope',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: ['upcoming', 'history', 'all'], default: 'all' },
          },
          {
            name: 'type',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: ['admission', 'session'] },
          },
        ],
        responses: {
          '200': {
            description: 'Lista',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    items: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Appointment' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['appointments'],
        summary: 'Crear turno (mock; live gated WRITE_DISABLED)',
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['patientId', 'professionalId', 'slotId', 'type'],
                properties: {
                  patientId: { type: 'string' },
                  professionalId: { type: 'string' },
                  slotId: { type: 'string' },
                  type: { type: 'string', enum: ['admission', 'session'] },
                  paymentRef: { type: 'string' },
                  markPaid: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Creado',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Appointment' } },
            },
          },
          '403': {
            description: 'WRITE_DISABLED',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/v1/appointments/{id}': {
      get: {
        tags: ['appointments'],
        summary: 'Detalle de turno',
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Appointment' } },
            },
          },
          '404': {
            description: 'No encontrado',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/v1/appointments/{id}/reschedule': {
      post: {
        tags: ['appointments'],
        summary: 'Reprogramar (mock; live gated WRITE_DISABLED)',
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['slotId'],
                properties: { slotId: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Appointment' } },
            },
          },
          '403': {
            description: 'WRITE_DISABLED',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/v1/appointments/{id}/cancel': {
      post: {
        tags: ['appointments'],
        summary: 'Cancelar (mock; live gated WRITE_DISABLED)',
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Appointment' } },
            },
          },
          '403': {
            description: 'WRITE_DISABLED',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
  },
} as const;
