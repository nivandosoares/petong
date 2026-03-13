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

    try {
      await apiRequest("/api/transparency/campaigns", {
        method: "POST",
        auth: true,
        tenantId: getTenantId(),
        body: {
          name: valueFrom(event.currentTarget, "name"),
          description: valueFrom(event.currentTarget, "description"),
          goalAmount: valueFrom(event.currentTarget, "goalAmount")
        }
      });

      event.currentTarget.reset();
      await refreshBoard();
      await loadPublicTenantView();
      setFlash("Campaign created.", false);
    } catch (error) {
      setFlash(error.message, true);
    }
  }

  async function handleDonationSubmit(event) {
    event.preventDefault();

    try {
      await apiRequest("/api/transparency/donations", {
        method: "POST",
        auth: true,
        tenantId: getTenantId(),
        body: {
          campaignId: valueFrom(event.currentTarget, "campaignId"),
          donorName: valueFrom(event.currentTarget, "donorName"),
          amount: valueFrom(event.currentTarget, "amount"),
          note: valueFrom(event.currentTarget, "note")
        }
      });

      event.currentTarget.reset();
      await refreshBoard();
      await loadPublicTenantView();
      setFlash("Donation recorded.", false);
    } catch (error) {
      setFlash(error.message, true);
    }
  }

  async function handleExpenseSubmit(event) {
    event.preventDefault();

    try {
      await apiRequest("/api/transparency/expenses", {
        method: "POST",
        auth: true,
        tenantId: getTenantId(),
        body: {
          campaignId: valueFrom(event.currentTarget, "campaignId"),
          category: valueFrom(event.currentTarget, "category"),
          description: valueFrom(event.currentTarget, "description"),
          amount: valueFrom(event.currentTarget, "amount")
        }
      });

      event.currentTarget.reset();
      await refreshBoard();
      await loadPublicTenantView();
      setFlash("Expense recorded.", false);
    } catch (error) {
      setFlash(error.message, true);
    }
  }

  async function handleRegisterSubmit(event) {
    event.preventDefault();

    try {
      const result = await apiRequest("/api/auth/register", {
        method: "POST",
        body: {
          name: valueFrom(event.currentTarget, "name"),
          email: valueFrom(event.currentTarget, "email"),
          password: valueFrom(event.currentTarget, "password")
        }
      });

      authToken = result.token;
      window.localStorage.setItem("petong_auth_token", authToken);
      event.currentTarget.reset();
      await refreshPlatform();
      setFlash("Registered and authenticated.", false);
    } catch (error) {
      setFlash(error.message, true);
    }
  }

  async function handleLoginSubmit(event) {
    event.preventDefault();

    try {
      const result = await apiRequest("/api/auth/login", {
        method: "POST",
        body: {
          email: valueFrom(event.currentTarget, "email"),
          password: valueFrom(event.currentTarget, "password")
        }
      });

      authToken = result.token;
      window.localStorage.setItem("petong_auth_token", authToken);
      event.currentTarget.reset();
      await refreshPlatform();
      setFlash("Logged in.", false);
    } catch (error) {
      setFlash(error.message, true);
    }
  }

  async function handleTenantSubmit(event) {
    event.preventDefault();

    try {
      await apiRequest("/api/tenants", {
        method: "POST",
        auth: true,
        body: {
          name: valueFrom(event.currentTarget, "name"),
          slug: valueFrom(event.currentTarget, "slug"),
          primaryColor: valueFrom(event.currentTarget, "primaryColor"),
          secondaryColor: valueFrom(event.currentTarget, "secondaryColor"),
          description: valueFrom(event.currentTarget, "description")
        }
      });

      event.currentTarget.reset();
      await refreshPlatform();
      setFlash("NGO created.", false);
    } catch (error) {
      setFlash(error.message, true);
    }
  }

  async function handleTenantThemeSubmit(event) {
    event.preventDefault();

    try {
      await apiRequest(`/api/tenants/${valueFrom(event.currentTarget, "tenantId")}`, {
        method: "PATCH",
        auth: true,
        body: {
          logo: valueFrom(event.currentTarget, "logo"),
          primaryColor: valueFrom(event.currentTarget, "primaryColor"),
          secondaryColor: valueFrom(event.currentTarget, "secondaryColor"),
          description: valueFrom(event.currentTarget, "description")
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

    try {
      await apiRequest(`/api/tenants/${valueFrom(event.currentTarget, "tenantId")}/members`, {
        method: "POST",
        auth: true,
        body: {
          email: valueFrom(event.currentTarget, "email"),
          role: valueFrom(event.currentTarget, "role")
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

    try {
      await apiRequest("/api/pets", {
        method: "POST",
        auth: true,
        tenantId: getTenantId(),
        body: {
          name: valueFrom(event.currentTarget, "name"),
          species: valueFrom(event.currentTarget, "species"),
          breed: valueFrom(event.currentTarget, "breed"),
          size: valueFrom(event.currentTarget, "size"),
          city: valueFrom(event.currentTarget, "city"),
          healthStatus: valueFrom(event.currentTarget, "healthStatus"),
          specialNeeds: valueFrom(event.currentTarget, "specialNeeds"),
          housingRequirement: "any",
          childrenFriendly: true,
          otherAnimalsFriendly: true,
          description: valueFrom(event.currentTarget, "description"),
          photoUrls: valueFrom(event.currentTarget, "photoUrls")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          ageGroup: valueFrom(event.currentTarget, "ageGroup")
        }
      });

      event.currentTarget.reset();
      await refreshBoard();
      setFlash("Pet registered.", false);
    } catch (error) {
      setFlash(error.message, true);
    }
  }

  async function handleProfileSubmit(event) {
    event.preventDefault();

    try {
      await apiRequest("/api/adoption-profile", {
        method: "POST",
        auth: true,
        body: {
          housingType: valueFrom(event.currentTarget, "housingType"),
          yardAvailability: parseBoolean(valueFrom(event.currentTarget, "yardAvailability")),
          city: valueFrom(event.currentTarget, "city"),
          hasChildren: parseBoolean(valueFrom(event.currentTarget, "hasChildren")),
          hasOtherAnimals: parseBoolean(valueFrom(event.currentTarget, "hasOtherAnimals")),
          petExperience: valueFrom(event.currentTarget, "petExperience"),
          preferredPetSize: valueFrom(event.currentTarget, "preferredPetSize"),
          canHandleSpecialNeeds: parseBoolean(valueFrom(event.currentTarget, "canHandleSpecialNeeds"))
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

    try {
      await apiRequest("/api/applications", {
        method: "POST",
        auth: true,
        tenantId: getTenantId(),
        body: {
          petId: valueFrom(event.currentTarget, "petId"),
          adopterName: valueFrom(event.currentTarget, "adopterName"),
          message: valueFrom(event.currentTarget, "message")
        }
      });

      event.currentTarget.reset();
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
