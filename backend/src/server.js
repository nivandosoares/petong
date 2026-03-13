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

  const server = http.createServer((request, response) => {
    handleRequest(request, response, {
      adoptionService,
      platformService
    });
  });

  return { server, adoptionService, platformService };
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

  if (method === "GET" && (STATIC_FILES[url.pathname] || isAppShellRoute(url.pathname))) {
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

  const memberMatch = url.pathname.match(/^\/api\/tenants\/([^/]+)\/members$/);
  if (method === "POST" && memberMatch) {
    const body = await readJsonBody(request);
    writeJson(response, 201, {
      membership: services.platformService.addTenantMember({
        actorUserId: user.id,
        tenantId: memberMatch[1],
        userId: body.userId,
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
      ageGroup: body.ageGroup
    });
    writeJson(response, 201, { pet });
    return;
  }

  if (method === "GET" && url.pathname === "/api/applications") {
    writeJson(response, 200, { applications: services.adoptionService.listApplicationsByTenant(tenantId) });
    return;
  }

  if (method === "POST" && url.pathname === "/api/applications") {
    const body = await readJsonBody(request);
    const application = services.adoptionService.submitApplication({
      tenantId,
      petId: body.petId,
      adopterName: body.adopterName
    });
    writeJson(response, 201, { application });
    return;
  }

  const approveMatch = url.pathname.match(/^\/api\/applications\/([^/]+)\/approve$/);
  if (method === "POST" && approveMatch) {
    const result = services.adoptionService.approveApplication({
      tenantId,
      applicationId: approveMatch[1]
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
    platformDataFile: process.env.PETONG_PLATFORM_DATA_FILE
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
  return pathname === "/login" || pathname === "/dashboard" || /^\/t\/[^/]+$/.test(pathname);
}

module.exports = {
  createApp,
  injectRequest,
  startServer
};
