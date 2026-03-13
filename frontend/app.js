"use strict";

(function () {
  const presenter = window.PetongPresenter;

  const elements = {
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
    profileForm: document.querySelector("#profile-form"),
    discoveryTenantSlug: document.querySelector("#discovery-tenant-slug"),
    refreshDiscoveryButton: document.querySelector("#refresh-discovery-button"),
    petForm: document.querySelector("#pet-form"),
    applicationForm: document.querySelector("#application-form"),
    petsList: document.querySelector("#pets-list"),
    discoveryList: document.querySelector("#discovery-list"),
    publicPetsList: document.querySelector("#public-pets-list"),
    applicationsList: document.querySelector("#applications-list"),
    flash: document.querySelector("#flash")
  };

  let authToken = window.localStorage.getItem("petong_auth_token");
  let session = null;

  elements.registerForm.addEventListener("submit", handleRegisterSubmit);
  elements.loginForm.addEventListener("submit", handleLoginSubmit);
  elements.tenantForm.addEventListener("submit", handleTenantSubmit);
  elements.tenantThemeForm.addEventListener("submit", handleTenantThemeSubmit);
  elements.memberForm.addEventListener("submit", handleMemberSubmit);
  elements.refreshButton.addEventListener("click", refreshBoard);
  elements.profileForm.addEventListener("submit", handleProfileSubmit);
  elements.refreshDiscoveryButton.addEventListener("click", refreshDiscovery);
  elements.petForm.addEventListener("submit", handlePetSubmit);
  elements.applicationForm.addEventListener("submit", handleApplicationSubmit);
  elements.applicationsList.addEventListener("click", handleApplicationAction);
  elements.petsList.addEventListener("click", handlePetAction);

  refreshPlatform().then(async () => {
    await loadPublicTenantView();
    await refreshBoard();
    await refreshDiscovery();
  });

  async function refreshPlatform() {
    if (!authToken) {
      session = null;
      renderPlatform();
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
      setFlash(error.message, true);
    }
  }

  async function refreshBoard() {
    try {
      const tenantId = getTenantId();
      const [petsResponse, applicationsResponse] = await Promise.all([
        apiRequest("/api/pets", { tenantId }),
        apiRequest("/api/applications", { tenantId })
      ]);

      renderBoard({
        tenantId,
        pets: petsResponse.pets,
        applications: applicationsResponse.applications
      });
      setFlash(`Loaded tenant ${tenantId}.`, false);
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
        tenantId: getTenantId(),
        body: {
          petId: valueFrom(event.currentTarget, "petId"),
          adopterName: valueFrom(event.currentTarget, "adopterName")
        }
      });

      event.currentTarget.reset();
      await refreshBoard();
      setFlash("Application submitted.", false);
    } catch (error) {
      setFlash(error.message, true);
    }
  }

  async function handleApplicationAction(event) {
    const button = event.target.closest("[data-approve-id]");
    if (!button) {
      return;
    }

    try {
      await apiRequest(`/api/applications/${button.dataset.approveId}/approve`, {
        method: "POST",
        tenantId: getTenantId()
      });

      await refreshBoard();
      setFlash("Application approved.", false);
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
      elements.publicTenantView.innerHTML = presenter.renderPublicTenant(response.tenant);
      elements.publicPetsList.innerHTML = presenter.renderPublicPetCards(response.pets ?? []);
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

  function parseBoolean(value) {
    return String(value).trim().toLowerCase() === "true";
  }

  function setFlash(message, isError) {
    elements.flash.textContent = message;
    elements.flash.className = isError ? "flash flash-error" : "flash";
  }

  function valueFrom(form, fieldName) {
    return String(new FormData(form).get(fieldName) ?? "").trim();
  }
})();
