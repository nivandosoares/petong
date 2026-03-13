"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { AdoptionService } = require("../src/adoption-service");
const { PlatformService } = require("../src/platform-service");
const { injectRequest } = require("../src/server");

test("registers a user and returns a token", async () => {
  const response = await injectWithPlatform({
    method: "POST",
    url: "/api/auth/register",
    body: {
      name: "Ana",
      email: "ana@example.com",
      password: "password123"
    }
  });

  assert.equal(response.statusCode, 201);
  assert.equal(response.body.user.email, "ana@example.com");
  assert.ok(response.body.token);
});

test("creates a tenant for the authenticated user and lists memberships", async () => {
  const platformService = new PlatformService({ jwtSecret: "test-secret" });
  const registration = platformService.registerUser({
    name: "Ana",
    email: "ana@example.com",
    password: "password123"
  });

  const created = await injectWithPlatform(
    {
      method: "POST",
      url: "/api/tenants",
      headers: authHeaders(registration.token),
      body: {
        name: "Happy Paws",
        slug: "happy-paws",
        primaryColor: "#0f766e",
        secondaryColor: "#f59e0b",
        description: "Rescue collective"
      }
    },
    platformService
  );

  assert.equal(created.statusCode, 201);
  assert.equal(created.body.tenant.slug, "happy-paws");

  const listed = await injectWithPlatform(
    {
      method: "GET",
      url: "/api/my-tenants",
      headers: authHeaders(registration.token)
    },
    platformService
  );

  assert.equal(listed.statusCode, 200);
  assert.equal(listed.body.tenants.length, 1);
});

test("resolves tenants by slug for public routing", async () => {
  const platformService = new PlatformService({ jwtSecret: "test-secret" });
  const registration = platformService.registerUser({
    name: "Ana",
    email: "ana@example.com",
    password: "password123"
  });
  platformService.createTenant({
    creatorUserId: registration.user.id,
    name: "Happy Paws",
    slug: "happy-paws",
    primaryColor: "#0f766e",
    secondaryColor: "#f59e0b",
    description: "Rescue collective"
  });

  const response = await injectWithPlatform(
    {
      method: "GET",
      url: "/api/tenant-resolution?slug=happy-paws"
    },
    platformService
  );

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.tenant.name, "Happy Paws");
});

test("serves app shells for homepage, login, dashboard, and tenant routes", async () => {
  for (const pathname of ["/", "/login", "/dashboard", "/t/happy-paws", "/ngo/happy-paws"]) {
    const response = await injectWithPlatform({
      method: "GET",
      url: pathname
    });

    assert.equal(response.statusCode, 200);
    assert.match(response.body, /Petong/);
  }
});

test("updates tenant branding and serves public tenant data", async () => {
  const platformService = new PlatformService({ jwtSecret: "test-secret" });
  const registration = platformService.registerUser({
    name: "Ana",
    email: "ana@example.com",
    password: "password123"
  });
  const created = platformService.createTenant({
    creatorUserId: registration.user.id,
    name: "Happy Paws",
    slug: "happy-paws",
    primaryColor: "#0f766e",
    secondaryColor: "#f59e0b",
    description: "Rescue collective"
  });

  const updated = await injectWithPlatform(
    {
      method: "PATCH",
      url: `/api/tenants/${created.id}`,
      headers: authHeaders(registration.token),
      body: {
        logo: "https://example.com/logo.png",
        description: "Updated rescue collective"
      }
    },
    platformService
  );

  assert.equal(updated.statusCode, 200);
  assert.equal(updated.body.tenant.logo, "https://example.com/logo.png");

  const publicTenant = await injectWithPlatform(
    {
      method: "GET",
      url: "/api/public/tenants/happy-paws"
    },
    platformService
  );

  assert.equal(publicTenant.statusCode, 200);
  assert.equal(publicTenant.body.tenant.description, "Updated rescue collective");
});

test("creates an adoption profile and returns discovery matches", async () => {
  const platformService = new PlatformService({ jwtSecret: "test-secret" });
  const adoptionService = new AdoptionService();
  const registration = platformService.registerUser({
    name: "Ana",
    email: "ana@example.com",
    password: "password123"
  });
  const tenant = platformService.createTenant({
    creatorUserId: registration.user.id,
    name: "Happy Paws",
    slug: "happy-paws",
    primaryColor: "#0f766e",
    secondaryColor: "#f59e0b",
    description: "Rescue collective"
  });

  adoptionService.registerPet({
    tenantId: tenant.id,
    name: "Luna",
    species: "dog",
    size: "medium",
    city: "Sao Paulo",
    childrenFriendly: true
  });

  const profile = await injectRequest(adoptionService, {
    method: "POST",
    url: "/api/adoption-profile",
    headers: authHeaders(registration.token),
    platformService,
    body: {
      housingType: "apartment",
      yardAvailability: false,
      city: "Sao Paulo",
      hasChildren: true,
      hasOtherAnimals: false,
      petExperience: "experienced",
      preferredPetSize: "medium",
      canHandleSpecialNeeds: false
    }
  });

  assert.equal(profile.statusCode, 200);

  const discovery = await injectRequest(adoptionService, {
    method: "GET",
    url: "/api/discovery?tenantSlug=happy-paws",
    headers: authHeaders(registration.token),
    platformService
  });

  assert.equal(discovery.statusCode, 200);
  assert.equal(discovery.body.matches[0].name, "Luna");
});

test("supports adopter submission, staff review, and applicant history", async () => {
  const platformService = new PlatformService({ jwtSecret: "test-secret" });
  const adoptionService = new AdoptionService();
  const admin = platformService.registerUser({
    name: "Admin",
    email: "admin@example.com",
    password: "password123"
  });
  const adopter = platformService.registerUser({
    name: "Taylor",
    email: "taylor@example.com",
    password: "password123"
  });
  const tenant = platformService.createTenant({
    creatorUserId: admin.user.id,
    name: "Happy Paws",
    slug: "happy-paws",
    primaryColor: "#0f766e",
    secondaryColor: "#f59e0b",
    description: "Rescue collective"
  });

  adoptionService.registerPet({
    tenantId: tenant.id,
    name: "Luna",
    species: "dog"
  });

  const created = await injectRequest(adoptionService, {
    method: "POST",
    url: "/api/applications",
    headers: {
      ...authHeaders(adopter.token),
      "x-tenant-id": tenant.id
    },
    platformService,
    body: {
      petId: "pet_1",
      adopterName: "Taylor",
      message: "I have a quiet home."
    }
  });

  assert.equal(created.statusCode, 201);
  assert.equal(created.body.application.status, "pending");

  const reviewed = await injectRequest(adoptionService, {
    method: "POST",
    url: `/api/applications/${created.body.application.id}/review`,
    headers: {
      ...authHeaders(admin.token),
      "x-tenant-id": tenant.id
    },
    platformService,
    body: {
      status: "under_review",
      internalNote: "Interview booked"
    }
  });

  assert.equal(reviewed.statusCode, 200);
  assert.equal(reviewed.body.application.status, "under_review");

  const mine = await injectRequest(adoptionService, {
    method: "GET",
    url: "/api/my-applications",
    headers: authHeaders(adopter.token),
    platformService
  });

  assert.equal(mine.statusCode, 200);
  assert.equal(mine.body.applications.length, 1);
  assert.equal(mine.body.applications[0].status, "under_review");
});

async function injectWithPlatform(
  options,
  platformService = new PlatformService({ jwtSecret: "test-secret" })
) {
  return injectRequest(new AdoptionService(), {
    ...options,
    platformService
  });
}

function authHeaders(token) {
  return {
    authorization: `Bearer ${token}`
  };
}
