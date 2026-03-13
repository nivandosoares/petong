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
  const service = options.service ?? new AdoptionService();

  const server = http.createServer((request, response) => {
    handleRequest(request, response, service);
  });

  return { server, service };
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

  if (error instanceof NotFoundError) {
    return 404;
  }

  return 500;
}

function handleRequest(request, response, service) {
  routeRequest(request, response, service).catch((error) => {
    const statusCode = mapErrorToStatus(error);
    const message = statusCode === 500 ? "Internal server error" : error.message;
    writeError(response, statusCode, message);
  });
}

async function routeRequest(request, response, service) {
  const url = new URL(request.url, "http://localhost");
  const method = request.method ?? "GET";

  if (method === "GET" && STATIC_FILES[url.pathname]) {
    writeStaticFile(response, STATIC_FILES[url.pathname]);
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

  const tenantId = request.headers["x-tenant-id"];
  if (!tenantId || typeof tenantId !== "string") {
    writeError(response, 400, "Header x-tenant-id is required");
    return;
  }

  if (method === "GET" && url.pathname === "/api/pets") {
    writeJson(response, 200, { pets: service.listPetsByTenant(tenantId) });
    return;
  }

  if (method === "POST" && url.pathname === "/api/pets") {
    const body = await readJsonBody(request);
    const pet = service.registerPet({
      tenantId,
      name: body.name,
      species: body.species,
      ageGroup: body.ageGroup
    });
    writeJson(response, 201, { pet });
    return;
  }

  if (method === "GET" && url.pathname === "/api/applications") {
    writeJson(response, 200, { applications: service.listApplicationsByTenant(tenantId) });
    return;
  }

  if (method === "POST" && url.pathname === "/api/applications") {
    const body = await readJsonBody(request);
    const application = service.submitApplication({
      tenantId,
      petId: body.petId,
      adopterName: body.adopterName
    });
    writeJson(response, 201, { application });
    return;
  }

  const approveMatch = url.pathname.match(/^\/api\/applications\/([^/]+)\/approve$/);
  if (method === "POST" && approveMatch) {
    const result = service.approveApplication({
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
  const { server, service } = createApp();

  return new Promise((resolve) => {
    server.listen(port, () => {
      resolve({ server, service, port });
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

    handleRequest(request, response, service);
  });
}

module.exports = {
  createApp,
  injectRequest,
  startServer
};
