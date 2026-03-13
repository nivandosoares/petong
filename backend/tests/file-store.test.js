"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const { AdoptionService } = require("../src/adoption-service");
const { JsonFileStore } = require("../src/file-store");

test("persists pets and applications across service instances", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "petong-store-"));
  const dataFile = path.join(tempDir, "store.json");

  try {
    const firstService = new AdoptionService({
      store: new JsonFileStore(dataFile)
    });

    const pet = firstService.registerPet({
      tenantId: "ngo_red",
      name: "Luna",
      species: "dog"
    });

    const application = firstService.submitApplication({
      tenantId: "ngo_red",
      petId: pet.id,
      adopterName: "Sam"
    });

    firstService.approveApplication({
      tenantId: "ngo_red",
      applicationId: application.id
    });

    const secondService = new AdoptionService({
      store: new JsonFileStore(dataFile)
    });

    assert.deepEqual(secondService.listPetsByTenant("ngo_red").map((item) => item.name), ["Luna"]);
    assert.equal(secondService.listApplicationsByTenant("ngo_red")[0].status, "approved");

    const nextPet = secondService.registerPet({
      tenantId: "ngo_red",
      name: "Milo",
      species: "cat"
    });

    assert.equal(nextPet.id, "pet_2");
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
