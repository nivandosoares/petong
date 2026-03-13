# Petong SaaS Implementation Plan (Agent-Executable)

This plan turns the current product into a deterministic execution roadmap for autonomous agents, with explicit validation for pages and use-case flows.

## Product goals

1. Enable NGOs to operate adoption workflows end-to-end without cross-tenant leakage.
2. Provide a trustworthy public tenant experience (branding + pets + transparency).
3. Keep quality gates automated through backend, frontend, and UI-audit E2E cycles.

---

## Current baseline (already implemented)

- Multi-tenant auth + membership + tenant routing.
- NGO management, pet management, discovery, adoption workflow, and transparency modules.
- Route-based frontend shell and tenant public routes.
- Automated backend/frontend tests and Selenium UI-audit command.

---

## Execution phases

## Phase 1 — UX hardening for critical operations (P0)

### Scope
- Remove manual ID entry where possible (`tenantId`, `petId`, `campaignId`) and replace with contextual selectors.
- Replace text-based booleans in adoption profile with checkboxes/toggles/selects.
- Improve form-level and global feedback consistency (success/error/in-progress).

### Deliverables
- UI controls updated in dashboard sections.
- Presenter/app render logic aligned with new controls.
- Regression tests updated for new selectors and behavior.

### Definition of done
- Staff can complete NGO, pet, application, and transparency actions without copying IDs manually.
- No boolean profile field accepts ambiguous free text.
- New and updated tests pass (`test:frontend` + `test:e2e`).

---

## Phase 2 — Role-based workflow productivity (P1)

### Scope
- Adoption review inbox improvements (status filters, sort by recency, reviewer note visibility).
- “My applications” timeline with state transitions and timestamps.
- Transparency dashboard usability upgrades (campaign filter, period view, totals confidence).

### Deliverables
- Enhanced dashboard route sections for adoptions/transparency.
- Small backend query enhancements only when strictly needed by UI.
- Flow-specific tests (unit + integration + E2E assertions).

### Definition of done
- NGO staff can process applications quickly and consistently.
- Applicant can understand exactly where they are in the funnel.
- Transparency data can be validated by campaign and period.

---

## Phase 3 — Public trust & conversion quality (P1)

### Scope
- Improve `/t/:slug` public page for clearer conversion journey.
- Add stronger public CTA path toward discovery/application.
- Improve consistency between internal data changes and public projection.

### Deliverables
- Public route UX improvements with accessibility checks.
- Contract tests for public tenant payload correctness.
- E2E scenario validating full visitor -> applicant path.

### Definition of done
- Public page is readable, accessible, and actionable.
- Public data always matches tenant-scoped backend truth.

---

## Phase 4 — Scale, reliability, and governance (P2)

### Scope
- Formalize role-capability matrix and enforce with tests.
- Add funnel telemetry and route-level error observability.
- Stabilize API contracts for key endpoints.

### Deliverables
- Authorization test matrix and failure-mode tests.
- Operational metrics/events documented and emitted.
- Versioned API contract snapshots for key workflows.

### Definition of done
- Security posture is test-proven.
- Regression detection is proactive and data-driven.

---

## Validation matrix (Pages × Use Cases × Tests)

| Page/Route | Primary Use Case | Validation Type | Gate |
|---|---|---|---|
| `/` | Visitor understands value and entry points | Frontend static + E2E smoke | `npm run test:frontend` + `npm run test:e2e` |
| `/login` | Register/login and session establishment | API integration + E2E flow | `npm run test:backend` + `npm run test:e2e` |
| `/dashboard` | Auth state + tenant context initialization | Frontend behavior + E2E | `npm run test:frontend` + `npm run test:e2e` |
| `/dashboard/ngo` | NGO create/update/member management | API integration + E2E | `npm run test:backend` + `npm run test:e2e` |
| `/dashboard/pets` | Pet lifecycle management | Service/API tests + E2E | `npm run test:backend` + `npm run test:e2e` |
| `/dashboard/adoptions` | Discovery + application + review | Service/API tests + E2E | `npm run test:backend` + `npm run test:e2e` |
| `/dashboard/transparency` | Campaigns, donations, expenses, summary | Service/API tests + E2E | `npm run test:backend` + `npm run test:e2e` |
| `/t/:slug` and `/ngo/:slug` | Public trust and tenant projection | Contract/API + E2E | `npm run test:backend` + `npm run test:e2e` |

---

## Core use-case E2E sequences (minimum)

1. Visitor opens landing, navigates to login/dashboard.
2. User registers, authenticates, and session state is rendered.
3. User creates NGO and validates tenant route rendering.
4. Staff updates NGO theme and confirms public route sync.
5. Staff creates pet and confirms list + public visibility expectations.
6. Applicant submits adoption request.
7. Staff moves request through workflow states.
8. Staff creates campaign, records donation/expense, validates summary.
9. Navigation consistency check (active route + visibility by section).

---

## Agent operating protocol

For each cycle touching frontend UX or user flow:

1. Implement smallest change from highest-priority open issue.
2. Run baseline tests (`npm run test:backend` and `npm run test:frontend`).
3. Run UI audit (`npm run test:e2e`).
4. Parse findings report (`tmp/ui-audit/ui-audit-report.{json,md}`).
5. Convert high/medium findings into issue entries with acceptance criteria.
6. Re-run same tests after fix.

If `test:e2e` cannot run due environment dependency gaps, classify as blocker and record exact missing dependency/error.

---

## Priority backlog template (copy into `docs/issues.md`)

```text
ISSUE-XXX
[phase-tag] short title

status: open
priority: high|medium|low
type: feature|bugfix|test|docs

description:
- problem statement
- scope boundaries
- tenant-isolation/security constraints

done criteria:
- functional behavior
- test assertions
- docs/changelog/version updates
```

---

## Exit criteria for roadmap completion

- No open high-severity UI audit findings for core funnels.
- All route-level use cases mapped above are covered by automated checks.
- Role/tenant isolation behavior is verified by backend tests.
- Public tenant data remains consistent under repeated update cycles.
