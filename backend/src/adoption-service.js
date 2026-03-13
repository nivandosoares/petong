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
  constructor(options = {}) {
    this.store = options.store ?? null;
    this.pets = new Map();
    this.applications = new Map();
    this.adoptionProfiles = new Map();
    this.sequence = {
      pet: 0,
      application: 0,
      adoptionProfile: 0
    };

    this.#hydrate();
  }

  registerPet(input) {
    assertRequired(input, ["tenantId", "name", "species"]);

    const pet = {
      id: this.#nextId("pet"),
      tenantId: input.tenantId,
      name: input.name,
      species: input.species,
      breed: input.breed ?? "",
      size: input.size ?? "medium",
      description: input.description ?? "",
      city: input.city ?? "",
      healthStatus: input.healthStatus ?? "unknown",
      specialNeeds: input.specialNeeds ?? "",
      housingRequirement: input.housingRequirement ?? "any",
      childrenFriendly: input.childrenFriendly ?? true,
      otherAnimalsFriendly: input.otherAnimalsFriendly ?? true,
      adoptionStatus: input.adoptionStatus ?? "available",
      photoUrls: Array.isArray(input.photoUrls) ? input.photoUrls : [],
      ageGroup: input.ageGroup ?? "unknown",
      status: input.adoptionStatus ?? "available",
      archivedAt: null,
      createdAt: new Date().toISOString()
    };

    this.pets.set(pet.id, pet);
    this.#persist();
    return { ...pet };
  }

  listPetsByTenant(tenantId) {
    return Array.from(this.pets.values())
      .filter((pet) => pet.tenantId === tenantId)
      .map((pet) => ({ ...pet }));
  }

  listPublicPetsByTenant(tenantId) {
    return Array.from(this.pets.values())
      .filter((pet) => pet.tenantId === tenantId && !pet.archivedAt && pet.adoptionStatus === "available")
      .map((pet) => ({ ...pet }));
  }

  upsertAdoptionProfile(input) {
    assertRequired(input, [
      "userId",
      "housingType",
      "yardAvailability",
      "city",
      "hasChildren",
      "hasOtherAnimals",
      "petExperience",
      "preferredPetSize",
      "canHandleSpecialNeeds"
    ]);

    const existing = Array.from(this.adoptionProfiles.values()).find(
      (profile) => profile.userId === input.userId
    );

    const profile = existing ?? {
      id: this.#nextId("adoptionProfile"),
      userId: input.userId,
      createdAt: new Date().toISOString()
    };

    profile.housingType = input.housingType;
    profile.yardAvailability = Boolean(input.yardAvailability);
    profile.city = input.city;
    profile.hasChildren = Boolean(input.hasChildren);
    profile.hasOtherAnimals = Boolean(input.hasOtherAnimals);
    profile.petExperience = input.petExperience;
    profile.preferredPetSize = input.preferredPetSize;
    profile.canHandleSpecialNeeds = Boolean(input.canHandleSpecialNeeds);
    profile.updatedAt = new Date().toISOString();

    this.adoptionProfiles.set(profile.id, profile);
    this.#persist();
    return { ...profile };
  }

  getAdoptionProfile(userId) {
    return (
      Array.from(this.adoptionProfiles.values())
        .find((profile) => profile.userId === userId) ?? null
    );
  }

  getDiscoveryMatches(input) {
    assertRequired(input, ["userId", "tenantId"]);

    const profile = this.getAdoptionProfile(input.userId);
    if (!profile) {
      throw new ValidationError("Adoption profile must be completed before discovery");
    }

    return this.listPublicPetsByTenant(input.tenantId)
      .map((pet) => {
        const result = scorePet(profile, pet);
        return {
          ...pet,
          compatibilityScore: result.score,
          compatibilityNotes: result.notes
        };
      })
      .sort((left, right) => right.compatibilityScore - left.compatibilityScore);
  }

  updatePet(input) {
    assertRequired(input, ["tenantId", "petId"]);

    const pet = this.pets.get(input.petId);
    if (!pet) {
      throw new NotFoundError(`Pet ${input.petId} was not found`);
    }

    if (pet.tenantId !== input.tenantId) {
      throw new TenantMismatchError("Pet does not belong to the provided tenant");
    }

    const fields = [
      "name",
      "species",
      "breed",
      "size",
      "description",
      "city",
      "healthStatus",
      "housingRequirement",
      "childrenFriendly",
      "otherAnimalsFriendly",
      "specialNeeds",
      "adoptionStatus",
      "ageGroup"
    ];

    for (const field of fields) {
      if (input[field] !== undefined) {
        pet[field] = input[field];
      }
    }

    if (input.adoptionStatus !== undefined) {
      pet.status = input.adoptionStatus;
    }

    if (input.photoUrls !== undefined) {
      pet.photoUrls = Array.isArray(input.photoUrls) ? input.photoUrls : [];
    }

    this.#persist();
    return { ...pet };
  }

  archivePet(input) {
    assertRequired(input, ["tenantId", "petId"]);

    const pet = this.pets.get(input.petId);
    if (!pet) {
      throw new NotFoundError(`Pet ${input.petId} was not found`);
    }

    if (pet.tenantId !== input.tenantId) {
      throw new TenantMismatchError("Pet does not belong to the provided tenant");
    }

    pet.archivedAt = new Date().toISOString();
    pet.adoptionStatus = "archived";
    pet.status = "archived";
    this.#persist();

    return { ...pet };
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
    this.#persist();
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
    this.#persist();

    return {
      application: { ...application },
      pet: { ...pet }
    };
  }

  exportState() {
    return {
      sequence: { ...this.sequence },
      pets: Array.from(this.pets.values()).map((pet) => ({ ...pet })),
      applications: Array.from(this.applications.values()).map((application) => ({ ...application })),
      adoptionProfiles: Array.from(this.adoptionProfiles.values()).map((profile) => ({ ...profile }))
    };
  }

  #nextId(kind) {
    this.sequence[kind] += 1;
    return `${kind}_${this.sequence[kind]}`;
  }

  #hydrate() {
    if (!this.store) {
      return;
    }

    const state = this.store.load();
    if (!state) {
      return;
    }

    this.sequence = {
      pet: Number(state.sequence?.pet ?? 0),
      application: Number(state.sequence?.application ?? 0),
      adoptionProfile: Number(state.sequence?.adoptionProfile ?? 0)
    };

    this.pets = new Map((state.pets ?? []).map((pet) => [pet.id, { ...pet }]));
    this.applications = new Map(
      (state.applications ?? []).map((application) => [application.id, { ...application }])
    );
    this.adoptionProfiles = new Map(
      (state.adoptionProfiles ?? []).map((profile) => [profile.id, { ...profile }])
    );
  }

  #persist() {
    if (!this.store) {
      return;
    }

    this.store.save(this.exportState());
  }
}

function assertRequired(input, fields) {
  for (const field of fields) {
    if (!input || input[field] === undefined || input[field] === null || input[field] === "") {
      throw new ValidationError(`Field ${field} is required`);
    }
  }
}

function scorePet(profile, pet) {
  let score = 0;
  const notes = [];

  if (profile.preferredPetSize === pet.size) {
    score += 3;
    notes.push("matches preferred size");
  }

  if (profile.city.toLowerCase() === String(pet.city).toLowerCase()) {
    score += 3;
    notes.push("same city");
  }

  if (pet.housingRequirement === "any") {
    score += 1;
  } else if (pet.housingRequirement === "yard_required" && profile.yardAvailability) {
    score += 2;
    notes.push("yard requirement satisfied");
  } else if (pet.housingRequirement === "indoor_ok" && profile.housingType !== "farm") {
    score += 2;
    notes.push("housing fits indoor care");
  } else if (pet.housingRequirement === "yard_required" && !profile.yardAvailability) {
    score -= 3;
    notes.push("yard requirement not met");
  }

  if (profile.hasChildren) {
    score += pet.childrenFriendly ? 2 : -3;
    notes.push(pet.childrenFriendly ? "good with children" : "not ideal with children");
  }

  if (profile.hasOtherAnimals) {
    score += pet.otherAnimalsFriendly ? 2 : -2;
    notes.push(pet.otherAnimalsFriendly ? "good with other animals" : "may not fit other animals");
  }

  if (pet.specialNeeds) {
    if (profile.canHandleSpecialNeeds) {
      score += 2;
      notes.push("special-needs ready");
    } else {
      score -= 3;
      notes.push("special-needs support required");
    }
  }

  if (profile.petExperience === "experienced") {
    score += 1;
  }

  return { score, notes };
}

module.exports = {
  AdoptionService,
  NotFoundError,
  TenantMismatchError,
  ValidationError
};
