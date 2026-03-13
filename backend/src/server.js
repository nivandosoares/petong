"use strict";

const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { Readable } = require("node:stream");

const {
  AdoptionService,
  NotFoundError,
  TenantMismatchError,
  ValidationError
} = require("./adoption-service");
const { JsonFileStore } = require("./file-store");
const {
  AuthenticationError,
  AuthorizationError,
  PlatformService
} = require("./platform-service");
const { TransparencyService } = require("./transparency-service");

const ROOT_DIR = path.resolve(__dirname, "..", "..");
const FRONTEND_DIR = path.join(ROOT_DIR, "frontend");
const STATIC_FILES = {
  "/": path.join(FRONTEND_DIR, "index.html"),
  "/app.js": path.join(FRONTEND_DIR, "app.js"),
  "/presenter.js": path.join(FRONTEND_DIR, "presenter.js"),
  "/styles.css": path.join(FRONTEND_DIR, "styles.css")
};
const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8"
};

function createApp(options = {}) {
  const adoptionService =
    options.service ??
    new AdoptionService({
      store: new JsonFileStore(options.dataFile ?? path.join(ROOT_DIR, "tmp", "petong-data.json"))
    });
  const platformService =
    options.platformService ??
    new PlatformService({
      jwtSecret: options.jwtSecret ?? process.env.PETONG_JWT_SECRET ?? "development-secret",
      store: new JsonFileStore(
        options.platformDataFile ?? path.join(ROOT_DIR, "tmp", "petong-platform.json")
      )
    });
  const transparencyService =
    options.transparencyService ??
    new TransparencyService({
      store: new JsonFileStore(
        options.transparencyDataFile ?? path.join(ROOT_DIR, "tmp", "petong-transparency.json")
      )
    });

  const server = http.createServer((request, response) => {
    handleRequest(request, response, {
      adoptionService,
      platformService,
      transparencyService
    });
  });

  return { server, adoptionService, platformService, transparencyService };
}

async function readJsonBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  const raw = Buffer.concat(chunks).toString("utf8");

  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new ValidationError("Request body must be valid JSON");
  }
}

function writeJson(response, statusCode, body) {
  response.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

function writeError(response, statusCode, message) {
  writeJson(response, statusCode, { error: message });
}

function mapErrorToStatus(error) {
  if (error instanceof ValidationError) {
    return 400;
  }

  if (error instanceof TenantMismatchError) {
    return 403;
  }

  if (error instanceof AuthenticationError) {
    return 401;
  }

  if (error instanceof AuthorizationError) {
    return 403;
  }

  if (error instanceof NotFoundError) {
    return 404;
  }

  return 500;
}

function handleRequest(request, response, services) {
  routeRequest(request, response, services).catch((error) => {
    const statusCode = mapErrorToStatus(error);
    const message = statusCode === 500 ? "Internal server error" : error.message;
    writeError(response, statusCode, message);
  });
}

async function routeRequest(request, response, services) {
  const url = new URL(request.url, "http://localhost");
  const method = request.method ?? "GET";

  if (method === "GET" && (STATIC_FILES[url.pathname] || isAppShellRoute(url.pathname) || shouldServeAppShell(url.pathname))) {
    writeStaticFile(response, STATIC_FILES[url.pathname] ?? STATIC_FILES["/"]);
    return;
  }

  if (method === "GET" && url.pathname === "/health") {
    writeJson(response, 200, { status: "ok" });
    return;
  }

  if (!url.pathname.startsWith("/api/")) {
    writeError(response, 404, "Route not found");
    return;
  }

  if (method === "POST" && url.pathname === "/api/auth/register") {
    const body = await readJsonBody(request);
    writeJson(response, 201, services.platformService.registerUser(body));
    return;
  }

  if (method === "POST" && url.pathname === "/api/auth/login") {
    const body = await readJsonBody(request);
    writeJson(response, 200, services.platformService.login(body));
    return;
  }

  if (method === "POST" && url.pathname === "/api/auth/logout") {
    writeJson(response, 200, { ok: true });
    return;
  }

  if (method === "GET" && url.pathname === "/api/tenant-resolution") {
    writeJson(response, 200, {
      tenant: services.platformService.resolveTenantBySlug(url.searchParams.get("slug"))
    });
    return;
  }

  const publicTenantMatch = url.pathname.match(/^\/api\/public\/tenants\/([^/]+)$/);
  if (method === "GET" && publicTenantMatch) {
    const tenant = services.platformService.resolveTenantBySlug(publicTenantMatch[1]);
    writeJson(response, 200, {
      tenant,
      pets: services.adoptionService.listPublicPetsByTenant(tenant.id),
      transparency: services.transparencyService.getTransparencySummary(tenant.id)
    });
    return;
  }

  const user = authenticateRequest(request, services.platformService);

  if (method === "GET" && url.pathname === "/api/session") {
    writeJson(response, 200, {
      user,
      tenants: services.platformService.listUserTenants(user.id)
    });
    return;
  }

  if (method === "POST" && url.pathname === "/api/tenants") {
    const body = await readJsonBody(request);
    writeJson(response, 201, {
      tenant: services.platformService.createTenant({
        creatorUserId: user.id,
        name: body.name,
        slug: body.slug,
        logo: body.logo,
        primaryColor: body.primaryColor,
        secondaryColor: body.secondaryColor,
        description: body.description
      })
    });
    return;
  }

  if (method === "GET" && url.pathname === "/api/my-tenants") {
    writeJson(response, 200, {
      tenants: services.platformService.listUserTenants(user.id)
    });
    return;
  }

  if ((method === "POST" || method === "PATCH") && url.pathname === "/api/adoption-profile") {
    const body = await readJsonBody(request);
    writeJson(response, 200, {
      profile: services.adoptionService.upsertAdoptionProfile({
        userId: user.id,
        housingType: body.housingType,
        yardAvailability: body.yardAvailability,
        city: body.city,
        hasChildren: body.hasChildren,
        hasOtherAnimals: body.hasOtherAnimals,
        petExperience: body.petExperience,
        preferredPetSize: body.preferredPetSize,
        canHandleSpecialNeeds: body.canHandleSpecialNeeds
      })
    });
    return;
  }

  if (method === "GET" && url.pathname === "/api/adoption-profile") {
    writeJson(response, 200, {
      profile: services.adoptionService.getAdoptionProfile(user.id)
    });
    return;
  }

  if (method === "GET" && url.pathname === "/api/discovery") {
    const tenantSlug = url.searchParams.get("tenantSlug");
    const tenant = services.platformService.resolveTenantBySlug(tenantSlug);
    writeJson(response, 200, {
      tenant,
      matches: services.adoptionService.getDiscoveryMatches({
        userId: user.id,
        tenantId: tenant.id
      })
    });
    return;
  }

  if (method === "GET" && url.pathname === "/api/my-applications") {
    writeJson(response, 200, {
      applications: services.adoptionService.listApplicationsByApplicant(user.id)
    });
    return;
  }

  const tenantMatch = url.pathname.match(/^\/api\/tenants\/([^/]+)$/);
  if (method === "GET" && tenantMatch) {
    writeJson(response, 200, {
      tenant: services.platformService.getTenantById(tenantMatch[1])
    });
    return;
  }

  if ((method === "PATCH" || method === "POST") && tenantMatch) {
    const body = await readJsonBody(request);
    writeJson(response, 200, {
      tenant: services.platformService.updateTenant({
        actorUserId: user.id,
        tenantId: tenantMatch[1],
        name: body.name,
        logo: body.logo,
        primaryColor: body.primaryColor,
        secondaryColor: body.secondaryColor,
        description: body.description
      })
    });
    return;
  }

  const memberMatch = url.pathname.match(/^\/api\/tenants\/([^/]+)\/members$/);
  if (method === "POST" && memberMatch) {
    const body = await readJsonBody(request);
    writeJson(response, 201, {
      membership: services.platformService.addTenantMember({
        actorUserId: user.id,
        tenantId: memberMatch[1],
        userId: body.userId,
        email: body.email,
        role: body.role
      })
    });
    return;
  }

  const tenantId = request.headers["x-tenant-id"];
  if (!tenantId || typeof tenantId !== "string") {
    writeError(response, 400, "Header x-tenant-id is required");
    return;
  }

  const tenantMembership = services.platformService.getMembershipForUser(tenantId, user.id);

  if (method === "GET" && url.pathname === "/api/pets") {
    writeJson(response, 200, { pets: services.adoptionService.listPetsByTenant(tenantId) });
    return;
  }

  if (method === "POST" && url.pathname === "/api/pets") {
    const body = await readJsonBody(request);
    const pet = services.adoptionService.registerPet({
      tenantId,
      name: body.name,
      species: body.species,
      breed: body.breed,
      size: body.size,
      description: body.description,
      city: body.city,
      healthStatus: body.healthStatus,
      specialNeeds: body.specialNeeds,
      housingRequirement: body.housingRequirement,
      childrenFriendly: body.childrenFriendly,
      otherAnimalsFriendly: body.otherAnimalsFriendly,
      adoptionStatus: body.adoptionStatus,
      photoUrls: body.photoUrls,
      ageGroup: body.ageGroup
    });
    writeJson(response, 201, { pet });
    return;
  }

  const petMatch = url.pathname.match(/^\/api\/pets\/([^/]+)$/);
  if ((method === "PATCH" || method === "POST") && petMatch) {
    const body = await readJsonBody(request);
    const pet = services.adoptionService.updatePet({
      tenantId,
      petId: petMatch[1],
      name: body.name,
      species: body.species,
      breed: body.breed,
      size: body.size,
      description: body.description,
      city: body.city,
      healthStatus: body.healthStatus,
      specialNeeds: body.specialNeeds,
      housingRequirement: body.housingRequirement,
      childrenFriendly: body.childrenFriendly,
      otherAnimalsFriendly: body.otherAnimalsFriendly,
      adoptionStatus: body.adoptionStatus,
      photoUrls: body.photoUrls,
      ageGroup: body.ageGroup
    });
    writeJson(response, 200, { pet });
    return;
  }

  const petArchiveMatch = url.pathname.match(/^\/api\/pets\/([^/]+)\/archive$/);
  if (method === "POST" && petArchiveMatch) {
    const pet = services.adoptionService.archivePet({
      tenantId,
      petId: petArchiveMatch[1]
    });
    writeJson(response, 200, { pet });
    return;
  }

  if (method === "GET" && url.pathname === "/api/applications") {
    writeJson(response, 200, { applications: services.adoptionService.listApplicationsByTenant(tenantId) });
    return;
  }

  if (method === "GET" && url.pathname === "/api/transparency/summary") {
    if (!tenantMembership) {
      throw new AuthorizationError("Tenant membership is required");
    }

    writeJson(response, 200, {
      summary: services.transparencyService.getTransparencySummary(tenantId)
    });
    return;
  }

  if (method === "GET" && url.pathname === "/api/transparency/campaigns") {
    if (!tenantMembership) {
      throw new AuthorizationError("Tenant membership is required");
    }

    writeJson(response, 200, {
      campaigns: services.transparencyService.listCampaignsByTenant(tenantId)
    });
    return;
  }

  if (method === "GET" && url.pathname === "/api/transparency/donations") {
    if (!tenantMembership) {
      throw new AuthorizationError("Tenant membership is required");
    }

    writeJson(response, 200, {
      donations: services.transparencyService.listDonationsByTenant(tenantId)
    });
    return;
  }

  if (method === "GET" && url.pathname === "/api/transparency/expenses") {
    if (!tenantMembership) {
      throw new AuthorizationError("Tenant membership is required");
    }

    writeJson(response, 200, {
      expenses: services.transparencyService.listExpensesByTenant(tenantId)
    });
    return;
  }

  if (method === "POST" && url.pathname === "/api/transparency/campaigns") {
    if (!tenantMembership || !["ngo_admin", "ngo_staff"].includes(tenantMembership.role)) {
      throw new AuthorizationError("Only NGO staff can manage transparency records");
    }

    const body = await readJsonBody(request);
    writeJson(response, 201, {
      campaign: services.transparencyService.createCampaign({
        tenantId,
        name: body.name,
        description: body.description,
        goalAmount: body.goalAmount,
        status: body.status
      })
    });
    return;
  }

  if (method === "POST" && url.pathname === "/api/transparency/donations") {
    if (!tenantMembership || !["ngo_admin", "ngo_staff"].includes(tenantMembership.role)) {
      throw new AuthorizationError("Only NGO staff can manage transparency records");
    }

    const body = await readJsonBody(request);
    writeJson(response, 201, {
      donation: services.transparencyService.recordDonation({
        tenantId,
        campaignId: body.campaignId,
        donorName: body.donorName,
        amount: body.amount,
        note: body.note,
        receivedAt: body.receivedAt
      })
    });
    return;
  }

  if (method === "POST" && url.pathname === "/api/transparency/expenses") {
    if (!tenantMembership || !["ngo_admin", "ngo_staff"].includes(tenantMembership.role)) {
      throw new AuthorizationError("Only NGO staff can manage transparency records");
    }

    const body = await readJsonBody(request);
    writeJson(response, 201, {
      expense: services.transparencyService.recordExpense({
        tenantId,
        campaignId: body.campaignId,
        category: body.category,
        description: body.description,
        amount: body.amount,
        spentAt: body.spentAt
      })
    });
    return;
  }

  if (method === "POST" && url.pathname === "/api/applications") {
    const body = await readJsonBody(request);
    const application = services.adoptionService.submitApplication({
      tenantId,
      petId: body.petId,
      applicantUserId: user.id,
      adopterName: body.adopterName,
      message: body.message
    });
    writeJson(response, 201, { application });
    return;
  }

  const reviewMatch = url.pathname.match(/^\/api\/applications\/([^/]+)\/review$/);
  if (method === "POST" && reviewMatch) {
    if (!tenantMembership || !["ngo_admin", "ngo_staff"].includes(tenantMembership.role)) {
      throw new AuthorizationError("Only NGO staff can review applications");
    }

    const body = await readJsonBody(request);
    const result = services.adoptionService.reviewApplication({
      tenantId,
      applicationId: reviewMatch[1],
      reviewerUserId: user.id,
      status: body.status,
      internalNote: body.internalNote
    });
    writeJson(response, 200, result);
    return;
  }

  writeError(response, 404, "Route not found");
}

function writeStaticFile(response, filePath) {
  const extension = path.extname(filePath);
  const contentType = CONTENT_TYPES[extension] ?? "application/octet-stream";
  const body = fs.readFileSync(filePath, "utf8");

  response.writeHead(200, { "content-type": contentType });
  response.end(body);
}

function startServer(port = 3001) {
  const { server, adoptionService, platformService } = createApp({
    dataFile: process.env.PETONG_DATA_FILE,
    platformDataFile: process.env.PETONG_PLATFORM_DATA_FILE,
    transparencyDataFile: process.env.PETONG_TRANSPARENCY_DATA_FILE
  });

  return new Promise((resolve) => {
    server.listen(port, () => {
      resolve({ server, adoptionService, platformService, port });
    });
  });
}

async function injectRequest(service, options) {
  const payload =
    options.body === undefined ? [] : [Buffer.from(JSON.stringify(options.body), "utf8")];

  const request = Readable.from(payload);
  request.method = options.method ?? "GET";
  request.url = options.url ?? "/";
  request.headers = options.headers ?? {};

  return new Promise((resolve) => {
    const response = {
      statusCode: 200,
      headers: {},
      writeHead(statusCode, headers) {
        this.statusCode = statusCode;
        this.headers = headers;
      },
      end(body) {
        const text = body ? String(body) : "";
        const contentType = this.headers["content-type"] ?? "";
        resolve({
          statusCode: this.statusCode,
          headers: this.headers,
          body: contentType.includes("application/json") && text ? JSON.parse(text) : text
        });
      }
    };

    handleRequest(request, response, {
      adoptionService: service,
      transparencyService: options.transparencyService ?? new TransparencyService(),
      platformService:
        options.platformService ?? new PlatformService({ jwtSecret: options.jwtSecret ?? "inject-secret" })
    });
  });
}

function authenticateRequest(request, platformService) {
  const header = request.headers.authorization ?? "";
  const match = header.match(/^Bearer (.+)$/);
  if (!match) {
    throw new AuthenticationError("Bearer token is required");
  }

  return platformService.authenticate(match[1]);
}

function isAppShellRoute(pathname) {
  return (
    pathname === "/about" ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/dashboard" ||
    /^\/dashboard\/[^/]+$/.test(pathname) ||
    /^\/t\/[^/]+$/.test(pathname) ||
    /^\/ngo\/[^/]+$/.test(pathname)
  );
}

function shouldServeAppShell(pathname) {
  return pathname !== "/health" && !pathname.startsWith("/api/") && !path.extname(pathname);
}

module.exports = {
  createApp,
  injectRequest,
  startServer
};
