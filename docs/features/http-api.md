# HTTP API Slice

The backend now exposes the adoption domain over HTTP so a frontend can interact with the tenant-aware workflows.

## Endpoints

- `GET /health`
- `GET /api/pets`
- `POST /api/pets`
- `GET /api/applications`
- `POST /api/applications`
- `POST /api/applications/:applicationId/approve`

## Tenant model

All `/api/*` routes require the `x-tenant-id` header.

That header is the tenant boundary for:

- listing pets
- creating pets
- listing applications
- submitting applications
- approving applications

## Error mapping

- `400` for validation and malformed JSON
- `403` for cross-tenant access
- `404` for missing routes or missing resources
- `500` for unexpected failures

## Run locally

```bash
npm run start:backend
```

The server listens on `http://localhost:3001` by default.
