"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const appJs = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");

test("contains additional top-level views for about and not-found", () => {
  assert.match(html, /data-view="about"/);
  assert.match(html, /data-view="not-found"/);
  assert.match(html, /href="\/about"/);
});

test("route config maps about, register alias, and unknown routes", () => {
  assert.match(appJs, /pathname === "\/about"/);
  assert.match(appJs, /pathname === "\/login" \|\| pathname === "\/register"/);
  assert.match(appJs, /view: "not-found"/);
});

test("route layout sets per-route titles and aria-current navigation state", () => {
  assert.match(appJs, /title: "Petong \| Home"/);
  assert.match(appJs, /title: "Petong \| Transparency"/);
  assert.match(appJs, /document\.title = route\.title/);
  assert.match(appJs, /link\.setAttribute\("aria-current", "page"\)/);
});
