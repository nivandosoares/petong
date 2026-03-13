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
  for (const pathname of ["/", "/login", "/dashboard", "/t/happy-paws"]) {
    const response = await injectWithPlatform({
      method: "GET",
      url: pathname
    });

    assert.equal(response.statusCode, 200);
    assert.match(response.body, /Petong/);
  }
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
