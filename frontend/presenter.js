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
  renderApplications,
  renderPets
};

if (typeof module !== "undefined") {
  module.exports = presenter;
}

if (typeof window !== "undefined") {
  window.PetongPresenter = presenter;
}
