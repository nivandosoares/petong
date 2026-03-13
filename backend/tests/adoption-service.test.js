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
        adopterName: "Sam"
      }),
    TenantMismatchError
  );
});

test("approves applications inside the same tenant and updates pet status", () => {
  const service = new AdoptionService();
  const pet = service.registerPet({
    tenantId: "ngo_red",
    name: "Luna",
    species: "dog"
  });

  const application = service.submitApplication({
    tenantId: "ngo_red",
    petId: pet.id,
    adopterName: "Sam"
  });

  const result = service.approveApplication({
    tenantId: "ngo_red",
    applicationId: application.id
  });

  assert.equal(result.application.status, "approved");
  assert.equal(result.pet.status, "pending_adoption");
  assert.deepEqual(
    service.listApplicationsByTenant("ngo_red").map((item) => item.adopterName),
    ["Sam"]
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
