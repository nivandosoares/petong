# Sprint 5: Adoption Workflow

Sprint 5 completes the adoption application workflow as a full tenant-aware vertical slice.

## Backend

- Applications now store the applicant user, applicant message, workflow status, internal review notes, and status history.
- Supported workflow states are `pending`, `under_review`, `approved`, and `rejected`.
- NGO staff review applications through `/api/applications/:applicationId/review`.
- Adopters can track their own submissions through `/api/my-applications`.

## Frontend

- The dashboard submission form now includes an applicant message.
- NGO staff can move applications through the workflow directly from the tenant board.
- Authenticated adopters can inspect their own application status history from the same frontend shell.

## Validation

- Tenant boundaries remain enforced for application reads and review actions.
- Only `ngo_admin` and `ngo_staff` members can review applications for a tenant.
- Application state changes are covered by backend, persistence, and presenter tests.
