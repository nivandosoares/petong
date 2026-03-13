"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const { JsonFileStore } = require("../src/file-store");
const {
  AuthenticationError,
  AuthorizationError,
  PlatformService
} = require("../src/platform-service");

test("registers and authenticates users with signed tokens", () => {
  const service = new PlatformService({ jwtSecret: "test-secret" });
  const result = service.registerUser({
    name: "Ana",
    email: "ana@example.com",
    password: "password123"
  });

  assert.equal(result.user.email, "ana@example.com");
  assert.ok(result.token);
  assert.equal(service.authenticate(result.token).id, result.user.id);
});

test("rejects invalid login attempts", () => {
  const service = new PlatformService({ jwtSecret: "test-secret" });
  service.registerUser({
    name: "Ana",
    email: "ana@example.com",
    password: "password123"
  });

  assert.throws(
    () =>
      service.login({
        email: "ana@example.com",
        password: "wrong"
      }),
    AuthenticationError
  );
});

test("creates tenants, memberships, and resolves tenant by slug", () => {
  const service = new PlatformService({ jwtSecret: "test-secret" });
  const admin = service.registerUser({
    name: "Ana",
    email: "ana@example.com",
    password: "password123"
  }).user;

  const tenant = service.createTenant({
    creatorUserId: admin.id,
    name: "Happy Paws",
    slug: "happy-paws",
    primaryColor: "#0f766e",
    secondaryColor: "#f59e0b",
    description: "Rescue collective"
  });

  assert.equal(tenant.slug, "happy-paws");
  assert.equal(tenant.members[0].role, "ngo_admin");
  assert.equal(service.resolveTenantBySlug("happy-paws").id, tenant.id);
});

test("restricts membership management to ngo admins", () => {
  const service = new PlatformService({ jwtSecret: "test-secret" });
  const admin = service.registerUser({
    name: "Ana",
    email: "ana@example.com",
    password: "password123"
  }).user;
  const staff = service.registerUser({
    name: "Leo",
    email: "leo@example.com",
    password: "password123"
  }).user;
  const outsider = service.registerUser({
    name: "Mia",
    email: "mia@example.com",
    password: "password123"
  }).user;

  const tenant = service.createTenant({
    creatorUserId: admin.id,
    name: "Happy Paws",
    slug: "happy-paws",
    primaryColor: "#0f766e",
    secondaryColor: "#f59e0b",
    description: "Rescue collective"
  });

  service.addTenantMember({
    actorUserId: admin.id,
    tenantId: tenant.id,
    userId: staff.id,
    role: "ngo_staff"
  });

  assert.throws(
    () =>
      service.addTenantMember({
        actorUserId: outsider.id,
        tenantId: tenant.id,
        userId: outsider.id,
        role: "ngo_staff"
      }),
    AuthorizationError
  );
});

test("persists users and tenants across service restarts", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "petong-platform-"));
  const dataFile = path.join(tempDir, "platform.json");

  try {
    const first = new PlatformService({
      jwtSecret: "test-secret",
      store: new JsonFileStore(dataFile)
    });

    const user = first.registerUser({
      name: "Ana",
      email: "ana@example.com",
      password: "password123"
    }).user;
    first.createTenant({
      creatorUserId: user.id,
      name: "Happy Paws",
      slug: "happy-paws",
      primaryColor: "#0f766e",
      secondaryColor: "#f59e0b",
      description: "Rescue collective"
    });

    const second = new PlatformService({
      jwtSecret: "test-secret",
      store: new JsonFileStore(dataFile)
    });

    assert.equal(second.listUserTenants(user.id).length, 1);
    assert.equal(second.resolveTenantBySlug("happy-paws").name, "Happy Paws");
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("allows ngo admins to update tenant branding and add members by email", () => {
  const service = new PlatformService({ jwtSecret: "test-secret" });
  const admin = service.registerUser({
    name: "Ana",
    email: "ana@example.com",
    password: "password123"
  }).user;
  service.registerUser({
    name: "Leo",
    email: "leo@example.com",
    password: "password123"
  });

  const tenant = service.createTenant({
    creatorUserId: admin.id,
    name: "Happy Paws",
    slug: "happy-paws",
    primaryColor: "#0f766e",
    secondaryColor: "#f59e0b",
    description: "Rescue collective"
  });

  const updated = service.updateTenant({
    actorUserId: admin.id,
    tenantId: tenant.id,
    logo: "https://example.com/logo.png",
    primaryColor: "#123456",
    secondaryColor: "#abcdef",
    description: "Updated rescue collective"
  });

  service.addTenantMember({
    actorUserId: admin.id,
    tenantId: tenant.id,
    email: "leo@example.com",
    role: "ngo_staff"
  });

  assert.equal(updated.theme.primaryColor, "#123456");
  assert.equal(service.getTenantById(tenant.id).members.length, 2);
});
