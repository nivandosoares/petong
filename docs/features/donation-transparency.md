# Sprint 6 Donation Transparency

Sprint 6 adds the first transparency dashboard slice for public trust and internal NGO bookkeeping.

## Domain model

Each tenant now supports:

- donation campaigns with names, descriptions, goals, and status
- donation records with donor name, amount, optional campaign link, and note
- expense records with category, description, amount, and optional campaign link

All records remain tenant-scoped.

## API surface

Protected tenant routes:

- `GET /api/transparency/summary`
- `GET /api/transparency/campaigns`
- `GET /api/transparency/donations`
- `GET /api/transparency/expenses`
- `POST /api/transparency/campaigns`
- `POST /api/transparency/donations`
- `POST /api/transparency/expenses`

Public tenant route:

- `GET /api/public/tenants/{slug}`

The public tenant payload now includes a transparency summary alongside pets and tenant branding.

## Frontend behavior

The dashboard now lets NGO staff:

- create fundraising campaigns
- record donations
- record expenses
- inspect tenant-level totals and campaign progress

Visitors on public tenant pages can now see:

- total raised
- total spent
- current balance
- campaign progress cards

## Persistence

Transparency records persist in a dedicated runtime file:

- `tmp/petong-transparency.json`

Override path:

- `PETONG_TRANSPARENCY_DATA_FILE`
