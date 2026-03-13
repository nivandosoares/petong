"use strict";

class TenantMismatchError extends Error {
  constructor(message) {
    super(message);
    this.name = "TenantMismatchError";
  }
}

class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = "NotFoundError";
  }
}

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
  }
}

class AdoptionService {
  constructor() {
    this.pets = new Map();
    this.applications = new Map();
    this.sequence = {
      pet: 0,
      application: 0
    };
  }

  registerPet(input) {
    assertRequired(input, ["tenantId", "name", "species"]);

    const pet = {
      id: this.#nextId("pet"),
      tenantId: input.tenantId,
      name: input.name,
      species: input.species,
      ageGroup: input.ageGroup ?? "unknown",
      status: "available",
      createdAt: new Date().toISOString()
    };

    this.pets.set(pet.id, pet);
    return { ...pet };
  }

  listPetsByTenant(tenantId) {
    return Array.from(this.pets.values())
      .filter((pet) => pet.tenantId === tenantId)
      .map((pet) => ({ ...pet }));
  }

  submitApplication(input) {
    assertRequired(input, ["tenantId", "petId", "adopterName"]);

    const pet = this.pets.get(input.petId);
    if (!pet) {
      throw new NotFoundError(`Pet ${input.petId} was not found`);
    }

    if (pet.tenantId !== input.tenantId) {
      throw new TenantMismatchError("Pet does not belong to the provided tenant");
    }

    if (pet.status !== "available") {
      throw new ValidationError(`Pet ${input.petId} is not available for adoption`);
    }

    const application = {
      id: this.#nextId("application"),
      tenantId: input.tenantId,
      petId: input.petId,
      adopterName: input.adopterName,
      status: "submitted",
      createdAt: new Date().toISOString()
    };

    this.applications.set(application.id, application);
    return { ...application };
  }

  listApplicationsByTenant(tenantId) {
    return Array.from(this.applications.values())
      .filter((application) => application.tenantId === tenantId)
      .map((application) => ({ ...application }));
  }

  approveApplication(input) {
    assertRequired(input, ["tenantId", "applicationId"]);

    const application = this.applications.get(input.applicationId);
    if (!application) {
      throw new NotFoundError(`Application ${input.applicationId} was not found`);
    }

    if (application.tenantId !== input.tenantId) {
      throw new TenantMismatchError("Application does not belong to the provided tenant");
    }

    const pet = this.pets.get(application.petId);
    if (!pet) {
      throw new NotFoundError(`Pet ${application.petId} was not found`);
    }

    application.status = "approved";
    pet.status = "pending_adoption";

    return {
      application: { ...application },
      pet: { ...pet }
    };
  }

  #nextId(kind) {
    this.sequence[kind] += 1;
    return `${kind}_${this.sequence[kind]}`;
  }
}

function assertRequired(input, fields) {
  for (const field of fields) {
    if (!input || input[field] === undefined || input[field] === null || input[field] === "") {
      throw new ValidationError(`Field ${field} is required`);
    }
  }
}

module.exports = {
  AdoptionService,
  NotFoundError,
  TenantMismatchError,
  ValidationError
};
