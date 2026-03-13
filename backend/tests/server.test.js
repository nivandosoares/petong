"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { AdoptionService } = require("../src/adoption-service");
const { PlatformService } = require("../src/platform-service");
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

test("returns public pets on the public tenant endpoint", async () => {
  const service = new AdoptionService();
  const auth = createAuthContext();
  const tenant = auth.platformService.createTenant({
    creatorUserId: auth.user.id,
    name: "Happy Paws",
    slug: "happy-paws",
    primaryColor: "#0f766e",
    secondaryColor: "#f59e0b",
    description: "Rescue collective"
  });

  service.registerPet({
    tenantId: tenant.id,
    name: "Luna",
    species: "dog",
    city: "Sao Paulo"
  });

  const response = await injectRequest(service, {
    method: "GET",
    url: "/api/public/tenants/happy-paws",
    platformService: auth.platformService
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.pets.length, 1);
  assert.equal(response.body.pets[0].name, "Luna");
});

test("creates and lists tenant-scoped pets through the API", async () => {
  const service = new AdoptionService();
  const auth = createAuthContext();

  const createResponse = await injectRequest(service, {
    method: "POST",
    url: "/api/pets",
    headers: jsonHeaders("ngo_red", auth.token),
    platformService: auth.platformService,
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
    headers: jsonHeaders("ngo_blue", auth.token),
    platformService: auth.platformService,
    body: {
      name: "Milo",
      species: "cat"
    }
  });

  const response = await injectRequest(service, {
    method: "GET",
    url: "/api/pets",
    headers: {
      authorization: `Bearer ${auth.token}`,
      "x-tenant-id": "ngo_red"
    },
    platformService: auth.platformService
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body.pets.map((pet) => pet.name), ["Luna"]);
});

test("rejects cross-tenant application submission through the API", async () => {
  const service = new AdoptionService();
  const auth = createAuthContext();
  const petResponse = await injectRequest(service, {
    method: "POST",
    url: "/api/pets",
    headers: jsonHeaders("ngo_red", auth.token),
    platformService: auth.platformService,
    body: {
      name: "Luna",
      species: "dog"
    }
  });

  const response = await injectRequest(service, {
    method: "POST",
    url: "/api/applications",
    headers: jsonHeaders("ngo_blue", auth.token),
    platformService: auth.platformService,
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
  const auth = createAuthContext();
  const petResponse = await injectRequest(service, {
    method: "POST",
    url: "/api/pets",
    headers: jsonHeaders("ngo_red", auth.token),
    platformService: auth.platformService,
    body: {
      name: "Luna",
      species: "dog"
    }
  });

  const applicationResponse = await injectRequest(service, {
    method: "POST",
    url: "/api/applications",
    headers: jsonHeaders("ngo_red", auth.token),
    platformService: auth.platformService,
    body: {
      petId: petResponse.body.pet.id,
      adopterName: "Sam"
    }
  });

  const approveResponse = await injectRequest(service, {
    method: "POST",
    url: `/api/applications/${applicationResponse.body.application.id}/approve`,
    headers: {
      authorization: `Bearer ${auth.token}`,
      "x-tenant-id": "ngo_red"
    },
    platformService: auth.platformService
  });

  assert.equal(approveResponse.statusCode, 200);
  assert.equal(approveResponse.body.application.status, "approved");
  assert.equal(approveResponse.body.pet.status, "pending_adoption");
});

test("updates and archives pets through the API", async () => {
  const service = new AdoptionService();
  const auth = createAuthContext();
  const createResponse = await injectRequest(service, {
    method: "POST",
    url: "/api/pets",
    headers: jsonHeaders("ngo_red", auth.token),
    platformService: auth.platformService,
    body: {
      name: "Luna",
      species: "dog"
    }
  });

  const updated = await injectRequest(service, {
    method: "PATCH",
    url: `/api/pets/${createResponse.body.pet.id}`,
    headers: jsonHeaders("ngo_red", auth.token),
    platformService: auth.platformService,
    body: {
      description: "Friendly dog",
      city: "Sao Paulo",
      size: "medium"
    }
  });

  assert.equal(updated.statusCode, 200);
  assert.equal(updated.body.pet.city, "Sao Paulo");

  const archived = await injectRequest(service, {
    method: "POST",
    url: `/api/pets/${createResponse.body.pet.id}/archive`,
    headers: {
      authorization: `Bearer ${auth.token}`,
      "x-tenant-id": "ngo_red"
    },
    platformService: auth.platformService
  });

  assert.equal(archived.statusCode, 200);
  assert.equal(archived.body.pet.adoptionStatus, "archived");
});

test("requires tenant headers for protected API routes", async () => {
  const auth = createAuthContext();
  const response = await injectRequest(new AdoptionService(), {
    method: "GET",
    url: "/api/pets",
    headers: {
      authorization: `Bearer ${auth.token}`
    },
    platformService: auth.platformService
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.error, "Header x-tenant-id is required");
});

function jsonHeaders(tenantId, token) {
  return token
    ? {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        "x-tenant-id": tenantId
      }
    : {
      "content-type": "application/json",
      "x-tenant-id": tenantId
    };
}

function createAuthContext() {
  const platformService = new PlatformService({ jwtSecret: "test-secret" });
  const registration = platformService.registerUser({
    name: "Ana",
    email: "ana@example.com",
    password: "password123"
  });

  return {
    platformService,
    user: registration.user,
    token: registration.token
  };
}
