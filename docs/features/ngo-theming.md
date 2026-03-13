# Sprint 2 NGO Management And Theming

The project now includes the first Sprint 2 slice for NGO administration and public branding.

## Admin capabilities

- create NGOs
- update NGO branding:
  - logo
  - primary color
  - secondary color
  - description
- add NGO members by email
- review current tenant memberships in the dashboard

## Public capabilities

- public tenant resolution via `/ngo/{slug}`
- development fallback tenant route via `/t/{slug}`
- public tenant data via `GET /api/public/tenants/{slug}`

## Current implementation shape

The backend exposes branding and membership management through the existing Node server, and the frontend consumes those APIs from the same shell without adding new dependencies.

## Remaining Sprint 2 follow-up

The public landing page is functional and themed by tenant data, but it still shares the broader application shell. A more specialized public presentation can be refined in a later pass without changing the core tenant and theming APIs.
