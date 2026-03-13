"use strict";

function renderPets(pets) {
  if (!pets.length) {
    return '<div class="empty">No pets registered for this tenant yet.</div>';
  }

  return pets
    .map(
      (pet) => `
        <article class="card">
          <div class="card-top">
            <div>
              <h3>${escapeHtml(pet.name)}</h3>
              <p class="card-meta">Pet ID: ${escapeHtml(pet.id)}</p>
            </div>
            <span class="badge">${escapeHtml(pet.status)}</span>
          </div>
          <p class="card-meta">Species: ${escapeHtml(pet.species)}</p>
          <p class="card-meta">Age group: ${escapeHtml(pet.ageGroup)}</p>
        </article>
      `
    )
    .join("");
}

function renderApplications(applications) {
  if (!applications.length) {
    return '<div class="empty">No adoption applications for this tenant yet.</div>';
  }

  return applications
    .map(
      (application) => `
        <article class="card">
          <div class="card-top">
            <div>
              <h3>${escapeHtml(application.adopterName)}</h3>
              <p class="card-meta">Application ID: ${escapeHtml(application.id)}</p>
            </div>
            <span class="badge">${escapeHtml(application.status)}</span>
          </div>
          <p class="card-meta">Pet ID: ${escapeHtml(application.petId)}</p>
          ${
            application.status === "submitted"
              ? `<div class="card-actions">
                  <button class="button" type="button" data-approve-id="${escapeHtml(application.id)}">
                    Approve
                  </button>
                </div>`
              : ""
          }
        </article>
      `
    )
    .join("");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const presenter = {
  escapeHtml,
  renderAuthState,
  renderApplications,
  renderPets,
  renderTenantCards
};

if (typeof module !== "undefined") {
  module.exports = presenter;
}

if (typeof window !== "undefined") {
  window.PetongPresenter = presenter;
}

function renderAuthState(session) {
  if (!session) {
    return `
      <div class="empty">
        <strong>Guest Mode</strong>
        <p class="card-meta">Register or log in to create NGOs, manage memberships, and access the dashboard.</p>
      </div>
    `;
  }

  return `
    <article class="card">
      <div class="card-top">
        <div>
          <h3>${escapeHtml(session.user.name)}</h3>
          <p class="card-meta">${escapeHtml(session.user.email)}</p>
        </div>
        <span class="badge">${escapeHtml(session.user.platformRole)}</span>
      </div>
      <p class="card-meta">Authenticated for Sprint 1 platform operations.</p>
    </article>
  `;
}

function renderTenantCards(tenants) {
  if (!tenants.length) {
    return '<div class="empty">No NGOs linked to this account yet.</div>';
  }

  return tenants
    .map(
      (entry) => `
        <article class="card">
          <div class="card-top">
            <div>
              <h3>${escapeHtml(entry.tenant.name)}</h3>
              <p class="card-meta">/${escapeHtml(`t/${entry.tenant.slug}`)}</p>
            </div>
            <span class="badge">${escapeHtml(entry.membership.role)}</span>
          </div>
          <p class="card-meta">${escapeHtml(entry.tenant.description)}</p>
        </article>
      `
    )
    .join("");
}
