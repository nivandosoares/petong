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
          <p class="card-meta">Breed: ${escapeHtml(pet.breed || "unknown")}</p>
          <p class="card-meta">Size: ${escapeHtml(pet.size || "unknown")}</p>
          <p class="card-meta">City: ${escapeHtml(pet.city || "unknown")}</p>
          <p class="card-meta">Health: ${escapeHtml(pet.healthStatus || "unknown")}</p>
          <p class="card-meta">Special needs: ${escapeHtml(pet.specialNeeds || "none")}</p>
          <p class="card-meta">Age group: ${escapeHtml(pet.ageGroup)}</p>
          <p class="card-meta">${escapeHtml(pet.description || "")}</p>
          ${
            pet.photoUrls?.length
              ? `<p class="card-meta">Photos: ${escapeHtml(String(pet.photoUrls.length))}</p>`
              : ""
          }
          ${
            pet.adoptionStatus !== "archived"
              ? `<div class="card-actions">
                  <button class="button button-secondary" type="button" data-archive-id="${escapeHtml(pet.id)}">
                    Archive
                  </button>
                </div>`
              : ""
          }
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
          <p class="card-meta">Applicant message: ${escapeHtml(application.message || "No message provided.")}</p>
          <p class="card-meta">History entries: ${escapeHtml(String(application.statusHistory?.length ?? 0))}</p>
          ${
            ["pending", "under_review"].includes(application.status)
              ? `<div class="card-actions">
                  <button class="button button-secondary" type="button" data-review-id="${escapeHtml(application.id)}" data-review-status="under_review">
                    Mark Under Review
                  </button>
                  <button class="button" type="button" data-review-id="${escapeHtml(application.id)}" data-review-status="approved">
                    Approve
                  </button>
                  <button class="button button-secondary" type="button" data-review-id="${escapeHtml(application.id)}" data-review-status="rejected">
                    Reject
                  </button>
                </div>`
              : ""
          }
        </article>
      `
    )
    .join("");
}

function renderMyApplications(applications) {
  if (!applications.length) {
    return '<div class="empty">You have not submitted adoption applications yet.</div>';
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
          <p class="card-meta">${escapeHtml(application.message || "No message provided.")}</p>
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
  renderDiscoveryMatches,
  renderDonationCards,
  renderExpenseCards,
  renderMyApplications,
  renderPublicPetCards,
  renderPublicTenant,
  renderPets,
  renderTransparencySummary,
  renderCampaignCards,
  renderTenantCards,
  renderTenantEditor
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

function renderTenantEditor(entry) {
  if (!entry) {
    return '<div class="empty">Log in and create an NGO to edit branding and members.</div>';
  }

  return `
    <article class="card">
      <div class="card-top">
        <div>
          <h3>${escapeHtml(entry.tenant.name)}</h3>
          <p class="card-meta">Role: ${escapeHtml(entry.membership.role)}</p>
        </div>
        <span class="badge">${escapeHtml(entry.tenant.slug)}</span>
      </div>
      <p class="card-meta">Theme: ${escapeHtml(entry.tenant.primaryColor)} / ${escapeHtml(entry.tenant.secondaryColor)}</p>
    </article>
  `;
}

function renderPublicTenant(tenant, transparency) {
  return `
    <section class="public-landing" style="--tenant-primary:${escapeHtml(tenant.primaryColor)};--tenant-secondary:${escapeHtml(tenant.secondaryColor)};">
      <div class="public-hero">
        <p class="eyebrow">NGO Landing Page</p>
        <h1>${escapeHtml(tenant.name)}</h1>
        <p class="lede">${escapeHtml(tenant.description)}</p>
        <div class="card-actions">
          <span class="badge">Tenant preview</span>
          <span class="badge">${escapeHtml(tenant.primaryColor)}</span>
          <span class="badge">${escapeHtml(tenant.secondaryColor)}</span>
        </div>
        ${tenant.logo ? `<p class="card-meta">Logo URL: ${escapeHtml(tenant.logo)}</p>` : ""}
      </div>
      ${renderTransparencySummary(transparency, { publicView: true })}
    </section>
  `;
}

function renderPublicPetCards(pets) {
  if (!pets.length) {
    return '<div class="empty">No public pets are available for this NGO right now.</div>';
  }

  return pets
    .map(
      (pet) => `
        <article class="card">
          <div class="card-top">
            <div>
              <h3>${escapeHtml(pet.name)}</h3>
              <p class="card-meta">${escapeHtml(pet.species)} • ${escapeHtml(pet.city || "location pending")}</p>
            </div>
            <span class="badge">${escapeHtml(pet.size || "unknown")}</span>
          </div>
          <p class="card-meta">${escapeHtml(pet.description || "No description yet.")}</p>
        </article>
      `
    )
    .join("");
}

function renderDiscoveryMatches(matches) {
  if (!matches.length) {
    return '<div class="empty">No discovery matches yet. Complete the profile and pick a tenant.</div>';
  }

  return matches
    .map(
      (match) => `
        <article class="card">
          <div class="card-top">
            <div>
              <h3>${escapeHtml(match.name)}</h3>
              <p class="card-meta">${escapeHtml(match.species)} • ${escapeHtml(match.city || "unknown city")}</p>
            </div>
            <span class="badge">Score ${escapeHtml(String(match.compatibilityScore))}</span>
          </div>
          <p class="card-meta">${escapeHtml(match.description || "No description yet.")}</p>
          <p class="card-meta">Why: ${escapeHtml((match.compatibilityNotes || []).join(", "))}</p>
        </article>
      `
    )
    .join("");
}

function renderTransparencySummary(summary, options = {}) {
  if (!summary) {
    return '<div class="empty">No transparency records available yet.</div>';
  }

  const title = options.publicView ? "Transparency Dashboard" : "Tenant Totals";

  return `
    <section class="transparency-block">
      <div class="panel-header">
        <h3>${title}</h3>
        <p class="card-meta">Raised ${formatCurrency(summary.totals.totalRaised)} • Spent ${formatCurrency(summary.totals.totalSpent)} • Balance ${formatCurrency(summary.totals.balance)}</p>
      </div>
      <div class="metrics-grid">
        <article class="metric-card">
          <strong>${formatCurrency(summary.totals.totalRaised)}</strong>
          <span class="card-meta">Total received</span>
        </article>
        <article class="metric-card">
          <strong>${formatCurrency(summary.totals.totalSpent)}</strong>
          <span class="card-meta">Recorded expenses</span>
        </article>
        <article class="metric-card">
          <strong>${escapeHtml(String(summary.totals.campaignCount))}</strong>
          <span class="card-meta">Active campaigns</span>
        </article>
      </div>
      <div class="list">${renderCampaignCards(summary.campaigns)}</div>
    </section>
  `;
}

function renderCampaignCards(campaigns) {
  if (!campaigns?.length) {
    return '<div class="empty">No campaigns created for this tenant yet.</div>';
  }

  return campaigns
    .map(
      (campaign) => `
        <article class="card">
          <div class="card-top">
            <div>
              <h3>${escapeHtml(campaign.name)}</h3>
              <p class="card-meta">Campaign ID: ${escapeHtml(campaign.id)}</p>
            </div>
            <span class="badge">${escapeHtml(campaign.status)}</span>
          </div>
          <p class="card-meta">${escapeHtml(campaign.description || "No public description yet.")}</p>
          <p class="card-meta">Raised ${formatCurrency(campaign.raisedAmount)} of ${formatCurrency(campaign.goalAmount)}</p>
          <p class="card-meta">Spent ${formatCurrency(campaign.spentAmount)} • Balance ${formatCurrency(campaign.balance)}</p>
        </article>
      `
    )
    .join("");
}

function renderDonationCards(donations) {
  if (!donations?.length) {
    return '<div class="empty">No donations recorded for this tenant yet.</div>';
  }

  return donations
    .map(
      (donation) => `
        <article class="card">
          <div class="card-top">
            <div>
              <h3>${escapeHtml(donation.donorName)}</h3>
              <p class="card-meta">Donation ID: ${escapeHtml(donation.id)}</p>
            </div>
            <span class="badge">${formatCurrency(donation.amount)}</span>
          </div>
          <p class="card-meta">Campaign: ${escapeHtml(donation.campaignId || "general fund")}</p>
          <p class="card-meta">${escapeHtml(donation.note || "No note provided.")}</p>
        </article>
      `
    )
    .join("");
}

function renderExpenseCards(expenses) {
  if (!expenses?.length) {
    return '<div class="empty">No expenses recorded for this tenant yet.</div>';
  }

  return expenses
    .map(
      (expense) => `
        <article class="card">
          <div class="card-top">
            <div>
              <h3>${escapeHtml(expense.description)}</h3>
              <p class="card-meta">Expense ID: ${escapeHtml(expense.id)}</p>
            </div>
            <span class="badge">${formatCurrency(expense.amount)}</span>
          </div>
          <p class="card-meta">Category: ${escapeHtml(expense.category)}</p>
          <p class="card-meta">Campaign: ${escapeHtml(expense.campaignId || "general fund")}</p>
        </article>
      `
    )
    .join("");
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(Number(value ?? 0));
}
