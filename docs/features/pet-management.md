# Sprint 3 Pet Management

The project now includes the first real Sprint 3 pet-management slice.

## Pet model

Pets now support:

- name
- species
- breed
- size
- description
- city
- health status
- special needs
- adoption status
- age group
- photo URLs
- archive state

## NGO management capabilities

- create richer pet records
- update pet details
- archive pets
- keep tenant isolation on every pet operation

## Public tenant capabilities

The public tenant API now returns available pets for the resolved NGO:

- `GET /api/public/tenants/{slug}`

The frontend uses that response to render a public pet listing for:

- `/ngo/{slug}`
- `/t/{slug}`

## Current photo support shape

Photo support is currently URL-based rather than binary upload-based.

This keeps Sprint 3 functional without introducing storage services or upload infrastructure before the product needs them.
