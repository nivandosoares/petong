"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { AdoptionService } = require("../src/adoption-service");
const { injectRequest } = require("../src/server");

test("reports health without a tenant header", async () => {
  const response = await injectRequest(new AdoptionService(), {
    method: "GET",
    url: "/health"
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { status: "ok" });
});

test("serves the frontend shell at the root route", async () => {
  const response = await injectRequest(new AdoptionService(), {
    method: "GET",
    url: "/"
  });

  assert.equal(response.statusCode, 200);
  assert.match(response.headers["content-type"], /text\/html/);
  assert.match(response.body, /Adoption Desk/);
});

test("serves the browser presenter bundle", async () => {
  const response = await injectRequest(new AdoptionService(), {
    method: "GET",
    url: "/presenter.js"
  });

  assert.equal(response.statusCode, 200);
  assert.match(response.headers["content-type"], /application\/javascript/);
  assert.match(response.body, /PetongPresenter/);
});

test("creates and lists tenant-scoped pets through the API", async () => {
  const service = new AdoptionService();

  const createResponse = await injectRequest(service, {
    method: "POST",
    url: "/api/pets",
    headers: jsonHeaders("ngo_red"),
    body: {
      name: "Luna",
      species: "dog",
      ageGroup: "adult"
    }
  });

  assert.equal(createResponse.statusCode, 201);
  assert.equal(createResponse.body.pet.tenantId, "ngo_red");

  await injectRequest(service, {
    method: "POST",
    url: "/api/pets",
    headers: jsonHeaders("ngo_blue"),
    body: {
      name: "Milo",
      species: "cat"
    }
  });

  const response = await injectRequest(service, {
    method: "GET",
    url: "/api/pets",
    headers: { "x-tenant-id": "ngo_red" }
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body.pets.map((pet) => pet.name), ["Luna"]);
});

test("rejects cross-tenant application submission through the API", async () => {
  const service = new AdoptionService();
  const petResponse = await injectRequest(service, {
    method: "POST",
    url: "/api/pets",
    headers: jsonHeaders("ngo_red"),
    body: {
      name: "Luna",
      species: "dog"
    }
  });

  const response = await injectRequest(service, {
    method: "POST",
    url: "/api/applications",
    headers: jsonHeaders("ngo_blue"),
    body: {
      petId: petResponse.body.pet.id,
      adopterName: "Sam"
    }
  });

  assert.equal(response.statusCode, 403);
  assert.match(response.body.error, /provided tenant/);
});

test("approves an application and updates the pet through the API", async () => {
  const service = new AdoptionService();
  const petResponse = await injectRequest(service, {
    method: "POST",
    url: "/api/pets",
    headers: jsonHeaders("ngo_red"),
    body: {
      name: "Luna",
      species: "dog"
    }
  });

  const applicationResponse = await injectRequest(service, {
    method: "POST",
    url: "/api/applications",
    headers: jsonHeaders("ngo_red"),
    body: {
      petId: petResponse.body.pet.id,
      adopterName: "Sam"
    }
  });

  const approveResponse = await injectRequest(service, {
    method: "POST",
    url: `/api/applications/${applicationResponse.body.application.id}/approve`,
    headers: { "x-tenant-id": "ngo_red" }
  });

  assert.equal(approveResponse.statusCode, 200);
  assert.equal(approveResponse.body.application.status, "approved");
  assert.equal(approveResponse.body.pet.status, "pending_adoption");
});

test("requires tenant headers for protected API routes", async () => {
  const response = await injectRequest(new AdoptionService(), {
    method: "GET",
    url: "/api/pets"
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.error, "Header x-tenant-id is required");
});

function jsonHeaders(tenantId) {
  return {
    "content-type": "application/json",
    "x-tenant-id": tenantId
  };
}
