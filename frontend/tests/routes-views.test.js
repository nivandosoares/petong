"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const appJs = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");

test("topbar and workspace include all supported app-shell routes", () => {
  assert.match(html, /href="\/"/);
  assert.match(html, /href="\/about"/);
  assert.match(html, /href="\/login"/);
  assert.match(html, /href="\/dashboard"/);
  assert.match(html, /href="\/dashboard\/ngo"/);
  assert.match(html, /href="\/dashboard\/pets"/);
  assert.match(html, /href="\/dashboard\/adoptions"/);
  assert.match(html, /href="\/dashboard\/transparency"/);
});

test("route config handles all supported frontend routes", () => {
  assert.match(appJs, /pathname === "\/"/);
  assert.match(appJs, /pathname === "\/about"/);
  assert.match(appJs, /pathname === "\/login"/);
  assert.match(appJs, /pathname === "\/login" \|\| pathname === "\/register"/);
  assert.match(appJs, /pathname === "\/dashboard" \|\| pathname === "\/dashboard\/ngo"/);
  assert.match(appJs, /pathname === "\/dashboard\/pets"/);
  assert.match(appJs, /pathname === "\/dashboard\/adoptions"/);
  assert.match(appJs, /pathname === "\/dashboard\/transparency"/);
  assert.ok(appJs.includes('if (/^\\/(?:ngo|t)\\/[^/]+$/.test(pathname))'));
  assert.match(appJs, /view: "landing", key: "landing", sections: \[\], title: "Petong \| Home"/);
  assert.match(appJs, /view: "not-found"/);
});
