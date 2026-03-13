# Sprint 1 Foundation

The product plan now has a concrete Sprint 1 implementation slice in the codebase.

## Included backend capabilities

- tenant entities with:
  - name
  - slug
  - logo
  - primary color
  - secondary color
  - description
- user registration and login
- JWT-style signed authentication tokens
- password hashing with Node `scrypt`
- tenant membership with `ngo_admin` and `ngo_staff`
- tenant resolution by slug

## Included frontend capabilities

- homepage shell
- login/register section
- NGO creation section
- dashboard shell for tenant-scoped pet and application management
- tenant route shell via `/t/{slug}`

## Current API additions

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/session`
- `POST /api/tenants`
- `POST /api/tenants/:tenantId/members`
- `GET /api/my-tenants`
- `GET /api/tenant-resolution?slug=...`

## Current limitation

Subdomain tenant resolution is not implemented yet. Sprint 1 currently supports the documented development fallback route: `/t/{tenant_slug}`.
