"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  AdoptionService,
  TenantMismatchError,
  ValidationError
} = require("../src/adoption-service");

test("registers and lists pets within the same tenant only", () => {
  const service = new AdoptionService();

  const luna = service.registerPet({
    tenantId: "ngo_red",
    name: "Luna",
    species: "dog",
    breed: "mixed",
    size: "medium",
    city: "Sao Paulo",
    ageGroup: "adult"
  });

  service.registerPet({
    tenantId: "ngo_blue",
    name: "Milo",
    species: "cat"
  });

  assert.equal(luna.id, "pet_1");
  assert.equal(luna.breed, "mixed");
  assert.deepEqual(service.listPetsByTenant("ngo_red").map((pet) => pet.name), ["Luna"]);
  assert.deepEqual(service.listPetsByTenant("ngo_blue").map((pet) => pet.name), ["Milo"]);
});

test("blocks adoption applications across tenants", () => {
  const service = new AdoptionService();
  const pet = service.registerPet({
    tenantId: "ngo_red",
    name: "Luna",
    species: "dog"
  });

  assert.throws(
    () =>
      service.submitApplication({
        tenantId: "ngo_blue",
        petId: pet.id,
        applicantUserId: "user_1",
        adopterName: "Sam"
      }),
    TenantMismatchError
  );
});

test("reviews applications inside the same tenant and tracks status history", () => {
  const service = new AdoptionService();
  const pet = service.registerPet({
    tenantId: "ngo_red",
    name: "Luna",
    species: "dog"
  });

  const application = service.submitApplication({
    tenantId: "ngo_red",
    petId: pet.id,
    applicantUserId: "user_1",
    adopterName: "Sam"
  });

  service.reviewApplication({
    tenantId: "ngo_red",
    applicationId: application.id,
    reviewerUserId: "user_2",
    status: "under_review",
    internalNote: "Home visit scheduled"
  });

  const result = service.reviewApplication({
    tenantId: "ngo_red",
    applicationId: application.id,
    reviewerUserId: "user_2",
    status: "approved",
    internalNote: "Approved after interview"
  });

  assert.equal(result.application.status, "approved");
  assert.equal(result.pet.status, "pending_adoption");
  assert.equal(result.application.statusHistory.length, 3);
  assert.equal(result.application.internalNotes.length, 2);
  assert.deepEqual(
    service.listApplicationsByTenant("ngo_red").map((item) => item.adopterName),
    ["Sam"]
  );
  assert.deepEqual(
    service.listApplicationsByApplicant("user_1").map((item) => item.id),
    [application.id]
  );
});

test("rejects invalid pet registrations", () => {
  const service = new AdoptionService();

  assert.throws(
    () =>
      service.registerPet({
        tenantId: "ngo_red",
        species: "dog"
      }),
    ValidationError
  );
});

test("updates, archives, and filters public pets", () => {
  const service = new AdoptionService();
  const pet = service.registerPet({
    tenantId: "ngo_red",
    name: "Luna",
    species: "dog"
  });

  const updated = service.updatePet({
    tenantId: "ngo_red",
    petId: pet.id,
    description: "Friendly dog",
    photoUrls: ["https://example.com/luna-1.jpg"]
  });

  assert.equal(updated.description, "Friendly dog");
  assert.equal(updated.photoUrls.length, 1);
  assert.equal(service.listPublicPetsByTenant("ngo_red").length, 1);

  service.archivePet({
    tenantId: "ngo_red",
    petId: pet.id
  });

  assert.equal(service.listPublicPetsByTenant("ngo_red").length, 0);
});

test("scores discovery matches without using age as primary ranking", () => {
  const service = new AdoptionService();
  service.registerPet({
    tenantId: "ngo_red",
    name: "Luna",
    species: "dog",
    size: "medium",
    city: "Sao Paulo",
    childrenFriendly: true,
    otherAnimalsFriendly: true
  });
  service.registerPet({
    tenantId: "ngo_red",
    name: "Bolt",
    species: "dog",
    size: "large",
    city: "Rio",
    childrenFriendly: false,
    specialNeeds: "daily medication",
    otherAnimalsFriendly: false
  });

  service.upsertAdoptionProfile({
    userId: "user_1",
    housingType: "apartment",
    yardAvailability: false,
    city: "Sao Paulo",
    hasChildren: true,
    hasOtherAnimals: true,
    petExperience: "experienced",
    preferredPetSize: "medium",
    canHandleSpecialNeeds: false
  });

  const matches = service.getDiscoveryMatches({
    userId: "user_1",
    tenantId: "ngo_red"
  });

  assert.equal(matches[0].name, "Luna");
  assert.ok(matches[0].compatibilityScore > matches[1].compatibilityScore);
});
