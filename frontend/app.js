"use strict";

(function () {
  const presenter = window.PetongPresenter;

  const elements = {
    views: Array.from(document.querySelectorAll("[data-view]")),
    routeLinks: Array.from(document.querySelectorAll("[data-route-link]")),
    routeSections: Array.from(document.querySelectorAll("[data-route-section]")),
    workspaceGrids: Array.from(document.querySelectorAll(".workspace-grid")),
    publicTenantView: document.querySelector("#public-tenant-view"),
    authState: document.querySelector("#auth-state"),
    registerForm: document.querySelector("#register-form"),
    loginForm: document.querySelector("#login-form"),
    passwordResetRequestForm: document.querySelector("#password-reset-request-form"),
    passwordResetConfirmForm: document.querySelector("#password-reset-confirm-form"),
    tenantForm: document.querySelector("#tenant-form"),
    tenantThemeForm: document.querySelector("#tenant-theme-form"),
    memberForm: document.querySelector("#member-form"),
    tenantEditor: document.querySelector("#tenant-editor"),
    tenantList: document.querySelector("#tenant-list"),
    tenantId: document.querySelector("#tenant-id"),
    refreshButton: document.querySelector("#refresh-button"),
    campaignForm: document.querySelector("#campaign-form"),
    donationForm: document.querySelector("#donation-form"),
    expenseForm: document.querySelector("#expense-form"),
    campaignList: document.querySelector("#campaign-list"),
    donationList: document.querySelector("#donation-list"),
    expenseList: document.querySelector("#expense-list"),
    transparencySummary: document.querySelector("#transparency-summary"),
    profileForm: document.querySelector("#profile-form"),
    discoveryTenantSlug: document.querySelector("#discovery-tenant-slug"),
    refreshDiscoveryButton: document.querySelector("#refresh-discovery-button"),
    petForm: document.querySelector("#pet-form"),
    applicationForm: document.querySelector("#application-form"),
    petsList: document.querySelector("#pets-list"),
    discoveryList: document.querySelector("#discovery-list"),
    refreshMyApplicationsButton: document.querySelector("#refresh-my-applications-button"),
    myApplicationsList: document.querySelector("#my-applications-list"),
    publicPetsList: document.querySelector("#public-pets-list"),
    applicationsList: document.querySelector("#applications-list"),
    flash: document.querySelector("#flash")
  };

  let authToken = window.localStorage.getItem("petong_auth_token");
  let session = null;

  applyPageLayout();

  elements.registerForm.addEventListener("submit", handleRegisterSubmit);
  elements.loginForm.addEventListener("submit", handleLoginSubmit);
  elements.passwordResetRequestForm.addEventListener("submit", handlePasswordResetRequestSubmit);
  elements.passwordResetConfirmForm.addEventListener("submit", handlePasswordResetConfirmSubmit);
  elements.tenantForm.addEventListener("submit", handleTenantSubmit);
  elements.tenantThemeForm.addEventListener("submit", handleTenantThemeSubmit);
  elements.memberForm.addEventListener("submit", handleMemberSubmit);
  elements.refreshButton.addEventListener("click", refreshBoard);
  elements.campaignForm.addEventListener("submit", handleCampaignSubmit);
  elements.donationForm.addEventListener("submit", handleDonationSubmit);
  elements.expenseForm.addEventListener("submit", handleExpenseSubmit);
  elements.profileForm.addEventListener("submit", handleProfileSubmit);
  elements.refreshDiscoveryButton.addEventListener("click", refreshDiscovery);
  elements.refreshMyApplicationsButton.addEventListener("click", refreshMyApplications);
  elements.petForm.addEventListener("submit", handlePetSubmit);
  elements.applicationForm.addEventListener("submit", handleApplicationSubmit);
  elements.applicationsList.addEventListener("click", handleApplicationAction);
  elements.petsList.addEventListener("click", handlePetAction);

  refreshPlatform().then(async () => {
    await loadPublicTenantView();
    if (isWorkspaceRoute()) {
      if (authToken) {
        await refreshBoard();
      } else {
        renderGuestWorkspaceState();
      }
      await refreshDiscovery();
      await refreshMyApplications();
    }
  });

  async function refreshPlatform() {
    if (!authToken) {
      session = null;
      renderPlatform();
      if (isWorkspaceRoute()) {
        renderGuestWorkspaceState();
      }
      return;
    }

    try {
      session = await apiRequest("/api/session", { auth: true });
      renderPlatform();
    } catch (error) {
      authToken = null;
      session = null;
      window.localStorage.removeItem("petong_auth_token");
      renderPlatform();
      if (isWorkspaceRoute()) {
        renderGuestWorkspaceState();
      }
      setFlash(error.message, true);
    }
  }

  async function refreshBoard() {
    try {
      const tenantId = getTenantId();
      const [petsResponse, applicationsResponse, transparencyResponse, campaignResponse, donationResponse, expenseResponse] = await Promise.all([
        apiRequest("/api/pets", { tenantId, auth: true }),
        apiRequest("/api/applications", { tenantId, auth: true }),
        apiRequest("/api/transparency/summary", { tenantId, auth: true }),
        apiRequest("/api/transparency/campaigns", { tenantId, auth: true }),
        apiRequest("/api/transparency/donations", { tenantId, auth: true }),
        apiRequest("/api/transparency/expenses", { tenantId, auth: true })
      ]);

      renderBoard({
        tenantId,
        pets: petsResponse.pets,
        applications: applicationsResponse.applications,
        transparency: transparencyResponse.summary,
        campaigns: campaignResponse.campaigns,
        donations: donationResponse.donations,
        expenses: expenseResponse.expenses
      });
      setFlash(`Loaded tenant ${tenantId}.`, false);
    } catch (error) {
      setFlash(error.message, true);
    }
  }

  async function handleCampaignSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;

    try {
      await apiRequest("/api/transparency/campaigns", {
        method: "POST",
        auth: true,
        tenantId: getTenantId(),
        body: {
          name: valueFrom(form, "name"),
          description: valueFrom(form, "description"),
          goalAmount: valueFrom(form, "goalAmount")
        }
      });

      form.reset();
      await refreshBoard();
      await loadPublicTenantView();
      setFlash("Campaign created.", false);
    } catch (error) {
      setFlash(error.message, true);
    }
  }

  async function handleDonationSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;

    try {
      await apiRequest("/api/transparency/donations", {
        method: "POST",
        auth: true,
        tenantId: getTenantId(),
        body: {
          campaignId: valueFrom(form, "campaignId"),
          donorName: valueFrom(form, "donorName"),
          amount: valueFrom(form, "amount"),
          note: valueFrom(form, "note")
        }
      });

      form.reset();
      await refreshBoard();
      await loadPublicTenantView();
      setFlash("Donation recorded.", false);
    } catch (error) {
      setFlash(error.message, true);
    }
  }

  async function handleExpenseSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;

    try {
      await apiRequest("/api/transparency/expenses", {
        method: "POST",
        auth: true,
        tenantId: getTenantId(),
        body: {
          campaignId: valueFrom(form, "campaignId"),
          category: valueFrom(form, "category"),
          description: valueFrom(form, "description"),
          amount: valueFrom(form, "amount")
        }
      });

      form.reset();
      await refreshBoard();
      await loadPublicTenantView();
      setFlash("Expense recorded.", false);
    } catch (error) {
      setFlash(error.message, true);
    }
  }

  async function handleRegisterSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;

    try {
      const result = await apiRequest("/api/auth/register", {
        method: "POST",
        body: {
          name: valueFrom(form, "name"),
          email: valueFrom(form, "email"),
          password: valueFrom(form, "password")
        }
      });

      authToken = result.token;
      window.localStorage.setItem("petong_auth_token", authToken);
      form.reset();
      await refreshPlatform();
      setFlash("Registered and authenticated.", false);
    } catch (error) {
      setFlash(error.message, true);
    }
  }

  async function handleLoginSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;

    try {
      const result = await apiRequest("/api/auth/login", {
        method: "POST",
        body: {
          email: valueFrom(form, "email"),
          password: valueFrom(form, "password")
        }
      });

      authToken = result.token;
      window.localStorage.setItem("petong_auth_token", authToken);
      form.reset();
      await refreshPlatform();
      setFlash("Logged in.", false);
    } catch (error) {
      setFlash(error.message, true);
    }
  }

  async function handlePasswordResetRequestSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;

    try {
      const result = await apiRequest("/api/auth/password-reset/request", {
        method: "POST",
        body: {
          email: valueFrom(form, "email")
        }
      });

      const tokenField = elements.passwordResetConfirmForm.querySelector('input[name="resetToken"]');
      if (result.resetToken && tokenField) {
        tokenField.value = result.resetToken;
      }
      setFlash(
        result.resetToken
          ? `Password reset token: ${result.resetToken}`
          : "If the account exists, a password reset token has been issued.",
        false
      );
    } catch (error) {
      setFlash(error.message, true);
    }
  }

  async function handlePasswordResetConfirmSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;

    try {
      const result = await apiRequest("/api/auth/password-reset/confirm", {
        method: "POST",
        body: {
          resetToken: valueFrom(form, "resetToken"),
          newPassword: valueFrom(form, "newPassword")
        }
      });

      authToken = result.token;
      window.localStorage.setItem("petong_auth_token", authToken);
      form.reset();
      await refreshPlatform();
      setFlash("Password updated and session refreshed.", false);
    } catch (error) {
      setFlash(error.message, true);
    }
  }

  async function handleTenantSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;

    try {
      await apiRequest("/api/tenants", {
        method: "POST",
        auth: true,
        body: {
          name: valueFrom(form, "name"),
          slug: valueFrom(form, "slug"),
          primaryColor: valueFrom(form, "primaryColor"),
          secondaryColor: valueFrom(form, "secondaryColor"),
          description: valueFrom(form, "description")
        }
      });

      form.reset();
      await refreshPlatform();
      setFlash("NGO created.", false);
    } catch (error) {
      setFlash(error.message, true);
    }
  }

  async function handleTenantThemeSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;

    try {
      await apiRequest(`/api/tenants/${valueFrom(form, "tenantId")}`, {
        method: "PATCH",
        auth: true,
        body: {
          logo: valueFrom(form, "logo"),
          primaryColor: valueFrom(form, "primaryColor"),
          secondaryColor: valueFrom(form, "secondaryColor"),
          description: valueFrom(form, "description")
        }
      });

      await refreshPlatform();
      await loadPublicTenantView();
      setFlash("NGO theme updated.", false);
    } catch (error) {
      setFlash(error.message, true);
    }
  }

  async function handleMemberSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;

    try {
      await apiRequest(`/api/tenants/${valueFrom(form, "tenantId")}/members`, {
        method: "POST",
        auth: true,
        body: {
          email: valueFrom(form, "email"),
          role: valueFrom(form, "role")
        }
      });

      await refreshPlatform();
      setFlash("Member added.", false);
    } catch (error) {
      setFlash(error.message, true);
    }
  }

  async function handlePetSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;

    try {
      await apiRequest("/api/pets", {
        method: "POST",
        auth: true,
        tenantId: getTenantId(),
        body: {
          name: valueFrom(form, "name"),
          species: valueFrom(form, "species"),
          breed: valueFrom(form, "breed"),
          size: valueFrom(form, "size"),
          city: valueFrom(form, "city"),
          healthStatus: valueFrom(form, "healthStatus"),
          specialNeeds: valueFrom(form, "specialNeeds"),
          housingRequirement: "any",
          childrenFriendly: true,
          otherAnimalsFriendly: true,
          description: valueFrom(form, "description"),
          photoUrls: valueFrom(form, "photoUrls")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          ageGroup: valueFrom(form, "ageGroup")
        }
      });

      form.reset();
      await refreshBoard();
      setFlash("Pet registered.", false);
    } catch (error) {
      setFlash(error.message, true);
    }
  }

  async function handleProfileSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;

    try {
      await apiRequest("/api/adoption-profile", {
        method: "POST",
        auth: true,
        body: {
          housingType: valueFrom(form, "housingType"),
          yardAvailability: parseBoolean(valueFrom(form, "yardAvailability")),
          city: valueFrom(form, "city"),
          hasChildren: parseBoolean(valueFrom(form, "hasChildren")),
          hasOtherAnimals: parseBoolean(valueFrom(form, "hasOtherAnimals")),
          petExperience: valueFrom(form, "petExperience"),
          preferredPetSize: valueFrom(form, "preferredPetSize"),
          canHandleSpecialNeeds: parseBoolean(valueFrom(form, "canHandleSpecialNeeds"))
        }
      });

      await refreshDiscovery();
      setFlash("Adoption profile saved.", false);
    } catch (error) {
      setFlash(error.message, true);
    }
  }

  async function handleApplicationSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;

    try {
      await apiRequest("/api/applications", {
        method: "POST",
        auth: true,
        tenantId: getTenantId(),
        body: {
          petId: valueFrom(form, "petId"),
          adopterName: valueFrom(form, "adopterName"),
          message: valueFrom(form, "message")
        }
      });

      form.reset();
      await refreshBoard();
      await refreshMyApplications();
      setFlash("Application submitted.", false);
    } catch (error) {
      setFlash(error.message, true);
    }
  }

  async function handleApplicationAction(event) {
    const button = event.target.closest("[data-review-id]");
    if (!button) {
      return;
    }

    try {
      await apiRequest(`/api/applications/${button.dataset.reviewId}/review`, {
        method: "POST",
        auth: true,
        tenantId: getTenantId(),
        body: {
          status: button.dataset.reviewStatus,
          internalNote: `Updated from dashboard to ${button.dataset.reviewStatus}`
        }
      });

      await refreshBoard();
      await refreshMyApplications();
      setFlash(`Application moved to ${button.dataset.reviewStatus}.`, false);
    } catch (error) {
      setFlash(error.message, true);
    }
  }

  async function handlePetAction(event) {
    const button = event.target.closest("[data-archive-id]");
    if (!button) {
      return;
    }

    try {
      await apiRequest(`/api/pets/${button.dataset.archiveId}/archive`, {
        method: "POST",
        auth: true,
        tenantId: getTenantId()
      });

      await refreshBoard();
      await loadPublicTenantView();
      setFlash("Pet archived.", false);
    } catch (error) {
      setFlash(error.message, true);
    }
  }

  function renderBoard(state) {
    elements.petsList.innerHTML = presenter.renderPets(state.pets);
    elements.applicationsList.innerHTML = presenter.renderApplications(state.applications);
    elements.transparencySummary.innerHTML = presenter.renderTransparencySummary(state.transparency);
    elements.campaignList.innerHTML = presenter.renderCampaignCards(state.campaigns);
    elements.donationList.innerHTML = presenter.renderDonationCards(state.donations);
    elements.expenseList.innerHTML = presenter.renderExpenseCards(state.expenses);
  }

  function renderGuestWorkspaceState() {
    renderBoard({
      pets: [],
      applications: [],
      transparency: null,
      campaigns: [],
      donations: [],
      expenses: []
    });
  }

  function renderPlatform() {
    elements.authState.innerHTML = presenter.renderAuthState(session);
    elements.tenantList.innerHTML = presenter.renderTenantCards(session?.tenants ?? []);
    elements.tenantEditor.innerHTML = presenter.renderTenantEditor(session?.tenants?.[0] ?? null);
    if (session?.tenants?.[0] && (!elements.tenantId.value.trim() || elements.tenantId.value === "ngo_red")) {
      elements.tenantId.value = session.tenants[0].tenant.id;
    }
  }

  async function loadPublicTenantView() {
    const slug = publicTenantSlug();
    if (!slug) {
      elements.publicTenantView.innerHTML = "";
      return;
    }

    try {
      const response = await apiRequest(`/api/public/tenants/${slug}`, {});
      elements.publicTenantView.innerHTML = presenter.renderPublicTenant(response.tenant, response.transparency);
      elements.publicPetsList.innerHTML = presenter.renderPublicPetCards(response.pets ?? []);
      document.title = `${response.tenant.name} | Petong`;
      if (!elements.discoveryTenantSlug.value.trim()) {
        elements.discoveryTenantSlug.value = slug;
      }
    } catch (error) {
      elements.publicTenantView.innerHTML = "";
      elements.publicPetsList.innerHTML = "";
      setFlash(error.message, true);
    }
  }

  async function refreshDiscovery() {
    if (!authToken) {
      elements.discoveryList.innerHTML = presenter.renderDiscoveryMatches([]);
      return;
    }

    const slug = elements.discoveryTenantSlug.value.trim() || publicTenantSlug();
    if (!slug) {
      elements.discoveryList.innerHTML = presenter.renderDiscoveryMatches([]);
      return;
    }

    try {
      const response = await apiRequest(`/api/discovery?tenantSlug=${encodeURIComponent(slug)}`, {
        auth: true
      });
      elements.discoveryList.innerHTML = presenter.renderDiscoveryMatches(response.matches ?? []);
    } catch (error) {
      elements.discoveryList.innerHTML = presenter.renderDiscoveryMatches([]);
      setFlash(error.message, true);
    }
  }

  async function refreshMyApplications() {
    if (!authToken) {
      elements.myApplicationsList.innerHTML = presenter.renderMyApplications([]);
      return;
    }

    try {
      const response = await apiRequest("/api/my-applications", {
        auth: true
      });
      elements.myApplicationsList.innerHTML = presenter.renderMyApplications(
        response.applications ?? []
      );
    } catch (error) {
      elements.myApplicationsList.innerHTML = presenter.renderMyApplications([]);
      setFlash(error.message, true);
    }
  }

  async function apiRequest(path, options) {
    const response = await fetch(path, {
      method: options.method ?? "GET",
      headers: buildHeaders(options),
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error ?? "Request failed");
    }

    return payload;
  }

  function buildHeaders(options) {
    const headers = {};

    if (options.tenantId) {
      headers["x-tenant-id"] = options.tenantId;
    }

    if (options.auth && authToken) {
      headers.authorization = `Bearer ${authToken}`;
    }

    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
    }

    return headers;
  }

  function getTenantId() {
    return elements.tenantId.value.trim();
  }

  function publicTenantSlug() {
    const match = window.location.pathname.match(/^\/(?:ngo|t)\/([^/]+)$/);
    return match ? match[1] : "";
  }

  function isWorkspaceRoute() {
    return currentRouteConfig().view === "dashboard";
  }

  function currentRouteConfig() {
    const pathname = window.location.pathname;

    if (pathname === "/") {
      return { view: "landing", key: "landing", sections: [], title: "Petong | Home" };
    }

    if (pathname === "/about") {
      return { view: "about", key: "about", sections: [], title: "Petong | About" };
    }

    if (pathname === "/login" || pathname === "/register") {
      return {
        view: "dashboard",
        key: "login",
        sections: ["access"],
        title: pathname === "/register" ? "Petong | Register" : "Petong | Login"
      };
    }

    if (pathname === "/dashboard" || pathname === "/dashboard/ngo") {
      return {
        view: "dashboard",
        key: pathname === "/dashboard" ? "dashboard" : "dashboard-ngo",
        sections: ["access", "ngo"],
        title: pathname === "/dashboard" ? "Petong | Dashboard" : "Petong | NGO Management"
      };
    }

    if (pathname === "/dashboard/pets") {
      return {
        view: "dashboard",
        key: "dashboard-pets",
        sections: ["access", "pets"],
        title: "Petong | Pets"
      };
    }

    if (pathname === "/dashboard/adoptions") {
      return {
        view: "dashboard",
        key: "dashboard-adoptions",
        sections: ["access", "adoption"],
        title: "Petong | Adoptions"
      };
    }

    if (pathname === "/dashboard/transparency") {
      return {
        view: "dashboard",
        key: "dashboard-transparency",
        sections: ["access", "transparency"],
        title: "Petong | Transparency"
      };
    }

    if (/^\/(?:ngo|t)\/[^/]+$/.test(pathname)) {
      return { view: "public", key: "public", sections: [], title: "Petong | Public NGO" };
    }

    return { view: "not-found", key: "not-found", sections: [], title: "Petong | Page Not Found" };
  }

  function applyPageLayout() {
    const route = currentRouteConfig();
    document.title = route.title;

    for (const view of elements.views) {
      const allowed = String(view.dataset.view ?? "")
        .split(/\s+/)
        .filter(Boolean);
      view.hidden = !allowed.includes(route.view);
    }

    for (const panel of elements.routeSections) {
      panel.hidden = route.view !== "dashboard" || !route.sections.includes(panel.dataset.routeSection);
    }

    for (const grid of elements.workspaceGrids) {
      grid.hidden = !Array.from(grid.querySelectorAll("[data-route-section]")).some(
        (panel) => !panel.hidden
      );
    }

    for (const link of elements.routeLinks) {
      const isActive = link.dataset.routeLink === route.key;
      link.classList.toggle("is-active", isActive);
      if (isActive) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    }
  }

  function parseBoolean(value) {
    return String(value).trim().toLowerCase() === "true";
  }

  function setFlash(message, isError) {
    elements.flash.textContent = message;
    elements.flash.className = isError ? "flash flash-error" : "flash";

    if (message) {
      elements.flash.focus();
    }
  }

  function valueFrom(form, fieldName) {
    return String(new FormData(form).get(fieldName) ?? "").trim();
  }
})();
