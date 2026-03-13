"use strict";

(function () {
  const presenter = window.PetongPresenter;

  const elements = {
    tenantId: document.querySelector("#tenant-id"),
    refreshButton: document.querySelector("#refresh-button"),
    petForm: document.querySelector("#pet-form"),
    applicationForm: document.querySelector("#application-form"),
    petsList: document.querySelector("#pets-list"),
    applicationsList: document.querySelector("#applications-list"),
    flash: document.querySelector("#flash")
  };

  elements.refreshButton.addEventListener("click", refreshBoard);
  elements.petForm.addEventListener("submit", handlePetSubmit);
  elements.applicationForm.addEventListener("submit", handleApplicationSubmit);
  elements.applicationsList.addEventListener("click", handleApplicationAction);

  refreshBoard();

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

  async function apiRequest(path, options) {
    const response = await fetch(path, {
      method: options.method ?? "GET",
      headers: buildHeaders(options.tenantId, options.body !== undefined),
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error ?? "Request failed");
    }

    return payload;
  }

  function buildHeaders(tenantId, hasBody) {
    const headers = {
      "x-tenant-id": tenantId
    };

    if (hasBody) {
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
