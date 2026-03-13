# Adoption Domain Slice

This repository now includes the first product implementation slice: a tenant-aware backend domain for pets and adoption applications.

## Scope

- register pets for a tenant
- list pets by tenant
- submit adoption applications for a tenant-owned pet
- approve an application within the same tenant
- enforce tenant isolation across pet and application operations

## Current shape

The implementation is intentionally in-memory and framework-free so the core rules can be tested before adding APIs or persistence.

Files:

- `backend/src/adoption-service.js`
- `backend/tests/adoption-service.test.js`

## Multi-tenant rules

- every pet belongs to exactly one `tenantId`
- every application belongs to exactly one `tenantId`
- a tenant cannot submit or approve an application for another tenant's pet
- approving an application changes the pet status to `pending_adoption`

## Next logical follow-up

Expose the adoption service through an HTTP API while preserving the same tenant checks.
