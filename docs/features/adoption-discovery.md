# Sprint 4 Adoption Discovery

The project now includes the first adoption-discovery slice with profile-driven matching.

## Adoption profile

Authenticated users can save:

- housing type
- yard availability
- city
- presence of children
- presence of other animals
- pet experience
- preferred pet size
- whether they can handle special needs

## Matching factors

Current compatibility scoring uses:

- size fit
- city match
- housing requirement fit
- presence of children
- presence of other animals
- special-needs suitability
- pet experience

Sex and age are not used as primary ranking criteria.

## Endpoints

- `GET /api/adoption-profile`
- `POST /api/adoption-profile`
- `GET /api/discovery?tenantSlug={slug}`

## Frontend behavior

The frontend now lets a signed-in user:

- save an adoption profile
- request discovery matches for a tenant slug
- review compatibility-ranked pet cards

## Runtime note

The public tenant route still serves the shared frontend shell first, then hydrates tenant-specific discovery and landing data client-side through the API.
