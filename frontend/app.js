"use strict";

(function () {
  const presenter = window.PetongPresenter;

  const elements = {
    authState: document.querySelector("#auth-state"),
    registerForm: document.querySelector("#register-form"),
    loginForm: document.querySelector("#login-form"),
    tenantForm: document.querySelector("#tenant-form"),
    tenantList: document.querySelector("#tenant-list"),
    tenantId: document.querySelector("#tenant-id"),
    refreshButton: document.querySelector("#refresh-button"),
    petForm: document.querySelector("#pet-form"),
    applicationForm: document.querySelector("#application-form"),
    petsList: document.querySelector("#pets-list"),
    applicationsList: document.querySelector("#applications-list"),
    flash: document.querySelector("#flash")
  };

  let authToken = window.localStorage.getItem("petong_auth_token");
  let session = null;

  elements.registerForm.addEventListener("submit", handleRegisterSubmit);
  elements.loginForm.addEventListener("submit", handleLoginSubmit);
  elements.tenantForm.addEventListener("submit", handleTenantSubmit);
  elements.refreshButton.addEventListener("click", refreshBoard);
  elements.petForm.addEventListener("submit", handlePetSubmit);
  elements.applicationForm.addEventListener("submit", handleApplicationSubmit);
  elements.applicationsList.addEventListener("click", handleApplicationAction);

  refreshPlatform().then(refreshBoard);

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

  async function handlePetSubmit(event) {
    event.preventDefault();

    try {
      await apiRequest("/api/pets", {
        method: "POST",
        tenantId: getTenantId(),
        body: {
          name: valueFrom(event.currentTarget, "name"),
          species: valueFrom(event.currentTarget, "species"),
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

  function renderBoard(state) {
    elements.petsList.innerHTML = presenter.renderPets(state.pets);
    elements.applicationsList.innerHTML = presenter.renderApplications(state.applications);
  }

  function renderPlatform() {
    elements.authState.innerHTML = presenter.renderAuthState(session);
    elements.tenantList.innerHTML = presenter.renderTenantCards(session?.tenants ?? []);
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

  function setFlash(message, isError) {
    elements.flash.textContent = message;
    elements.flash.className = isError ? "flash flash-error" : "flash";
  }

  function valueFrom(form, fieldName) {
    return String(new FormData(form).get(fieldName) ?? "").trim();
  }
})();
