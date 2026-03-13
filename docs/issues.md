ISSUE-001
Bootstrap autonomous agent workflow

status: closed
priority: high
type: docs

description:
create local agent guide
create master prompt
create issue tracker format
create automation scripts for loop, tests, and auto-commit
define minimal changelog and version files

done criteria:
repository contains the core files required to run unattended agent cycles locally

---

ISSUE-002
Add project-specific test commands

status: closed
priority: medium
type: test

description:
replace placeholder test execution with real backend frontend and e2e commands
document when each test suite should run

done criteria:
autonomous loop can run real project tests without manual command editing

---

ISSUE-003
Configure git identity and GitHub SSH remote

status: closed
priority: high
type: ops

description:
set local or global git user name and email
configure origin using git@github.com owner repo syntax
verify ssh authentication
push main branch

done criteria:
repository can create commits locally and push to GitHub over SSH

---

ISSUE-004
Automate runtime planning from test outcomes

status: closed
priority: high
type: feature

description:
make the autonomous loop derive the next action from the latest test results
continue automatically when tests pass
prioritize test repair when failures are caused by current work
stop only for blockers or human decisions

done criteria:
agent loop writes a next-cycle plan from test output and exits only on blocker states

---

ISSUE-005
Implement initial tenant-aware adoption backend slice

status: closed
priority: high
type: feature

description:
add the first product implementation code to the repository
model tenant-scoped pets and adoption applications
enforce tenant isolation in the core service
cover the behavior with automated backend tests

done criteria:
repository contains runnable backend domain code and tests for tenant-aware adoption workflows

---

ISSUE-006
Add remote preview workflow with Cloudflare Tunnel

status: closed
priority: high
type: feature

description:
add a repo-managed Cloudflare Tunnel helper for live remote previews
require explicit approval before any future installation step
document quick-tunnel and named-tunnel usage
cover config generation with automated tests

done criteria:
repository contains a tunnel helper, installation approval rules, and executable tests for the generated tunnel config

---

ISSUE-007
Add a live preview page behind the tunnel

status: closed
priority: medium
type: feature

description:
add a minimal local preview page that can be served immediately
provide a simple command to host it on localhost
verify the preview assets exist so the tunnel has real content to expose

done criteria:
repository contains a preview page and local preview server command for the tunnel workflow

---

ISSUE-008
Expose the adoption domain through an HTTP API

status: closed
priority: high
type: feature

description:
add a real backend API on top of the tenant-aware adoption service
require tenant headers on protected routes
support listing and creating pets plus application submission and approval
cover the API with integration-style backend tests

done criteria:
repository contains a runnable HTTP API for the adoption workflow with automated tests

---

ISSUE-009
Add the first interactive frontend for the adoption workflow

status: closed
priority: high
type: feature

description:
serve a real frontend from the current backend stack
provide tenant switching, pet registration, application submission, and approval actions
test both frontend rendering helpers and backend static asset delivery

done criteria:
repository contains a usable browser UI backed by the adoption API with automated backend and frontend tests

---

ISSUE-010
Persist adoption data across backend restarts

status: closed
priority: high
type: feature

description:
move the adoption workflow beyond in-memory-only storage
persist pets, applications, and sequence counters to disk
wire the backend runtime to load the persisted state on startup
cover persistence behavior with automated tests

done criteria:
repository retains adoption data after the backend process restarts

---

ISSUE-011
Implement Sprint 1 multi-tenant platform foundation

status: closed
priority: high
type: feature

description:
add tenant entities, user authentication, tenant membership, and tenant resolution
support registration, login, JWT authentication, and NGO creation
serve basic homepage, login, dashboard, and tenant routes from the current frontend shell
cover the core sprint 1 flows with automated backend and frontend tests

done criteria:
users can register, NGOs can be created, users can join an NGO, and tenant routes resolve in the running application

---

ISSUE-012
Implement Sprint 2 NGO management and public theming

status: closed
priority: high
type: feature

description:
allow NGO admins to update tenant branding and manage members
serve public NGO landing pages with tenant-specific theme data
support /ngo/{slug} and /t/{slug} public tenant routes
cover the new dashboard and public branding flows with tests

done criteria:
each NGO has a customizable public landing page and admins can manage profile and members

---

ISSUE-013
Document database pipeline and agent handoff installation

status: closed
priority: high
type: docs

description:
add database implementation to the delivery pipeline
formalize the code/doc/test standard for infrastructure and data work
create a handoff document so another agent can install prerequisites and continue the project

done criteria:
repository contains a database pipeline note and a durable install/continuation handoff doc

---

ISSUE-014
Implement Sprint 3 pet management

status: closed
priority: high
type: feature

description:
expand the pet domain with richer fields and NGO management workflows
add pet editing and archiving
prepare public pet listing on tenant landing pages
plan the first photo support slice without weakening tenant isolation

done criteria:
NGOs can manage richer pet records and the public tenant experience can list available pets

---

ISSUE-015
Implement Sprint 4 adoption discovery

status: closed
priority: high
type: feature

description:
add adoption profiles and compatibility-based discovery
score recommendations using housing, location, children, other animals, size, and special-needs suitability
avoid using sex and age as primary ranking criteria
surface recommendations in the frontend for real user interaction

done criteria:
users can save an adoption profile and receive ranked pet recommendations in the running application

---

ISSUE-016
Implement Sprint 5 adoption application workflow

status: closed
priority: high
type: feature

description:
expand adoption applications to support workflow states, reviewer actions, and status history
allow NGO staff to review, approve, reject, and annotate applications
surface status progression in the frontend for adopters and staff

done criteria:
the application workflow supports pending, under_review, approved, and rejected states with tracked history

---

ISSUE-017
Implement Sprint 6 donation transparency

status: closed
priority: high
type: feature

description:
add donation campaigns, donation records, expense records, and a public transparency dashboard
surface campaign progress and spending summaries in both the backend API and frontend tenant pages

done criteria:
visitors can view campaign totals, received donations, and recorded expenses for each NGO
