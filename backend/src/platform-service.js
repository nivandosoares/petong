"use strict";

const crypto = require("node:crypto");

const { NotFoundError, ValidationError } = require("./adoption-service");

class AuthenticationError extends Error {
  constructor(message) {
    super(message);
    this.name = "AuthenticationError";
  }
}

class AuthorizationError extends Error {
  constructor(message) {
    super(message);
    this.name = "AuthorizationError";
  }
}

class PlatformService {
  constructor(options = {}) {
    this.store = options.store ?? null;
    this.jwtSecret = options.jwtSecret ?? "development-secret";
    this.users = new Map();
    this.tenants = new Map();
    this.memberships = new Map();
    this.passwordResetTokens = new Map();
    this.sequence = {
      user: 0,
      tenant: 0,
      membership: 0
    };

    this.#hydrate();
  }

  registerUser(input) {
    assertRequired(input, ["name", "email", "password"]);

    const normalizedEmail = normalizeEmail(input.email);
    if (Array.from(this.users.values()).some((user) => user.email === normalizedEmail)) {
      throw new ValidationError(`User ${normalizedEmail} already exists`);
    }

    const user = {
      id: this.#nextId("user"),
      name: input.name,
      email: normalizedEmail,
      passwordHash: hashPassword(input.password),
      platformRole: "platform_user",
      createdAt: new Date().toISOString()
    };

    this.users.set(user.id, user);
    this.#persist();

    return {
      user: sanitizeUser(user),
      token: this.issueToken(user)
    };
  }

  login(input) {
    assertRequired(input, ["email", "password"]);

    const normalizedEmail = normalizeEmail(input.email);
    const user = Array.from(this.users.values()).find((item) => item.email === normalizedEmail);
    if (!user || !verifyPassword(input.password, user.passwordHash)) {
      throw new AuthenticationError("Invalid email or password");
    }

    return {
      user: sanitizeUser(user),
      token: this.issueToken(user)
    };
  }

  requestPasswordReset(input) {
    assertRequired(input, ["email"]);

    const normalizedEmail = normalizeEmail(input.email);
    const user = Array.from(this.users.values()).find((entry) => entry.email === normalizedEmail);
    if (!user) {
      return { ok: true, resetToken: null };
    }

    const resetToken = crypto.randomBytes(24).toString("hex");
    const tokenRecord = {
      token: resetToken,
      userId: user.id,
      email: user.email,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString()
    };

    for (const [token, record] of this.passwordResetTokens.entries()) {
      if (record.userId === user.id) {
        this.passwordResetTokens.delete(token);
      }
    }

    this.passwordResetTokens.set(resetToken, tokenRecord);
    this.#persist();
    return { ok: true, resetToken };
  }

  resetPassword(input) {
    assertRequired(input, ["resetToken", "newPassword"]);

    const tokenRecord = this.passwordResetTokens.get(input.resetToken);
    if (!tokenRecord) {
      throw new ValidationError("Password reset token is invalid");
    }

    if (Date.parse(tokenRecord.expiresAt) < Date.now()) {
      this.passwordResetTokens.delete(input.resetToken);
      this.#persist();
      throw new ValidationError("Password reset token has expired");
    }

    const user = this.users.get(tokenRecord.userId);
    if (!user) {
      this.passwordResetTokens.delete(input.resetToken);
      this.#persist();
      throw new NotFoundError("Password reset user was not found");
    }

    user.passwordHash = hashPassword(input.newPassword);
    this.passwordResetTokens.delete(input.resetToken);
    this.#persist();

    return {
      ok: true,
      user: sanitizeUser(user),
      token: this.issueToken(user)
    };
  }

  authenticate(token) {
    if (!token) {
      throw new AuthenticationError("Authentication token is required");
    }

    const payload = verifyToken(token, this.jwtSecret);
    const user = this.users.get(payload.sub);
    if (!user) {
      throw new AuthenticationError("Authenticated user was not found");
    }

    return sanitizeUser(user);
  }

  createTenant(input) {
    assertRequired(input, [
      "creatorUserId",
      "name",
      "slug",
      "primaryColor",
      "secondaryColor",
      "description"
    ]);

    if (!this.users.has(input.creatorUserId)) {
      throw new NotFoundError(`User ${input.creatorUserId} was not found`);
    }

    const slug = normalizeSlug(input.slug);
    if (Array.from(this.tenants.values()).some((tenant) => tenant.slug === slug)) {
      throw new ValidationError(`Tenant slug ${slug} is already in use`);
    }

    const tenant = {
      id: this.#nextId("tenant"),
      name: input.name,
      slug,
      logo: input.logo ?? "",
      primaryColor: input.primaryColor,
      secondaryColor: input.secondaryColor,
      description: input.description,
      createdAt: new Date().toISOString()
    };

    this.tenants.set(tenant.id, tenant);
    this.#createMembership({
      tenantId: tenant.id,
      userId: input.creatorUserId,
      role: "ngo_admin"
    });
    this.#persist();

    return this.getTenantById(tenant.id);
  }

  addTenantMember(input) {
    assertRequired(input, ["actorUserId", "tenantId", "role"]);

    const actorMembership = this.#findMembership(input.tenantId, input.actorUserId);
    if (!actorMembership || actorMembership.role !== "ngo_admin") {
      throw new AuthorizationError("Only NGO admins can manage tenant members");
    }

    const user = input.userId
      ? this.users.get(input.userId)
      : Array.from(this.users.values()).find((entry) => entry.email === normalizeEmail(input.email));
    if (!user) {
      throw new NotFoundError("Tenant member user was not found");
    }

    const existing = this.#findMembership(input.tenantId, user.id);
    if (existing) {
      existing.role = input.role;
      this.#persist();
      return { ...existing };
    }

    const membership = this.#createMembership({
      tenantId: input.tenantId,
      userId: user.id,
      role: input.role
    });
    this.#persist();
    return { ...membership };
  }

  updateTenant(input) {
    assertRequired(input, ["actorUserId", "tenantId"]);

    const actorMembership = this.#findMembership(input.tenantId, input.actorUserId);
    if (!actorMembership || actorMembership.role !== "ngo_admin") {
      throw new AuthorizationError("Only NGO admins can update tenant settings");
    }

    const tenant = this.tenants.get(input.tenantId);
    if (!tenant) {
      throw new NotFoundError(`Tenant ${input.tenantId} was not found`);
    }

    if (input.name !== undefined) {
      tenant.name = input.name;
    }
    if (input.logo !== undefined) {
      tenant.logo = input.logo;
    }
    if (input.primaryColor !== undefined) {
      tenant.primaryColor = input.primaryColor;
    }
    if (input.secondaryColor !== undefined) {
      tenant.secondaryColor = input.secondaryColor;
    }
    if (input.description !== undefined) {
      tenant.description = input.description;
    }

    this.#persist();
    return this.getTenantById(tenant.id);
  }

  listUserTenants(userId) {
    return Array.from(this.memberships.values())
      .filter((membership) => membership.userId === userId)
      .map((membership) => ({
        tenant: this.getTenantById(membership.tenantId),
        membership: { ...membership }
      }));
  }

  getMembershipForUser(tenantId, userId) {
    const membership = this.#findMembership(tenantId, userId);
    return membership ? { ...membership } : null;
  }

  resolveTenantBySlug(slug) {
    const tenant = Array.from(this.tenants.values()).find((item) => item.slug === slug);
    if (!tenant) {
      throw new NotFoundError(`Tenant ${slug} was not found`);
    }

    return this.getTenantById(tenant.id);
  }

  getTenantById(tenantId) {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new NotFoundError(`Tenant ${tenantId} was not found`);
    }

    return {
      ...tenant,
      theme: {
        logo: tenant.logo,
        primaryColor: tenant.primaryColor,
        secondaryColor: tenant.secondaryColor,
        description: tenant.description
      },
      members: Array.from(this.memberships.values())
        .filter((membership) => membership.tenantId === tenantId)
        .map((membership) => ({
          ...membership,
          user: sanitizeUser(this.users.get(membership.userId))
        }))
    };
  }

  exportState() {
    return {
      sequence: { ...this.sequence },
      users: Array.from(this.users.values()).map((user) => ({ ...user })),
      tenants: Array.from(this.tenants.values()).map((tenant) => ({ ...tenant })),
      memberships: Array.from(this.memberships.values()).map((membership) => ({ ...membership })),
      passwordResetTokens: Array.from(this.passwordResetTokens.values()).map((token) => ({ ...token }))
    };
  }

  issueToken(user) {
    return signToken({ sub: user.id, email: user.email }, this.jwtSecret);
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
      user: Number(state.sequence?.user ?? 0),
      tenant: Number(state.sequence?.tenant ?? 0),
      membership: Number(state.sequence?.membership ?? 0)
    };
    this.users = new Map((state.users ?? []).map((user) => [user.id, { ...user }]));
    this.tenants = new Map((state.tenants ?? []).map((tenant) => [tenant.id, { ...tenant }]));
    this.memberships = new Map(
      (state.memberships ?? []).map((membership) => [membership.id, { ...membership }])
    );
    this.passwordResetTokens = new Map(
      (state.passwordResetTokens ?? []).map((token) => [token.token, { ...token }])
    );
  }

  #persist() {
    if (!this.store) {
      return;
    }

    this.store.save(this.exportState());
  }

  #nextId(kind) {
    this.sequence[kind] += 1;
    return `${kind}_${this.sequence[kind]}`;
  }

  #createMembership(input) {
    const membership = {
      id: this.#nextId("membership"),
      tenantId: input.tenantId,
      userId: input.userId,
      role: input.role,
      createdAt: new Date().toISOString()
    };

    this.memberships.set(membership.id, membership);
    return membership;
  }

  #findMembership(tenantId, userId) {
    return Array.from(this.memberships.values()).find(
      (membership) => membership.tenantId === tenantId && membership.userId === userId
    );
  }
}

function assertRequired(input, fields) {
  for (const field of fields) {
    if (!input || input[field] === undefined || input[field] === null || input[field] === "") {
      throw new ValidationError(`Field ${field} is required`);
    }
  }
}

function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}

function normalizeSlug(slug) {
  return String(slug).trim().toLowerCase().replaceAll(/[^a-z0-9-]+/g, "-");
}

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    platformRole: user.platformRole,
    createdAt: user.createdAt
  };
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, passwordHash) {
  const [salt, expectedHash] = String(passwordHash).split(":");
  const actualHash = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(actualHash, "hex"), Buffer.from(expectedHash, "hex"));
}

function signToken(payload, secret) {
  const header = toBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = toBase64Url(JSON.stringify(payload));
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${header}.${body}`)
    .digest("base64url");

  return `${header}.${body}.${signature}`;
}

function verifyToken(token, secret) {
  const [header, body, signature] = String(token).split(".");
  if (!header || !body || !signature) {
    throw new AuthenticationError("Invalid authentication token");
  }

  const expected = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    throw new AuthenticationError("Invalid authentication token");
  }

  return JSON.parse(fromBase64Url(body));
}

function toBase64Url(value) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

module.exports = {
  AuthenticationError,
  AuthorizationError,
  PlatformService
};
