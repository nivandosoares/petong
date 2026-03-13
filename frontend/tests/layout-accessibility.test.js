"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const css = fs.readFileSync(path.join(__dirname, "..", "styles.css"), "utf8");

test("exposes skip link and landmark labels", () => {
  assert.match(html, /class="skip-link" href="#main-content"/);
  assert.match(html, /<main id="main-content">/);
  assert.match(html, /<nav class="topbar" aria-label="Primary">/);
  assert.match(html, /<nav class="workspace-nav" aria-label="Workspace sections">/);
});

test("uses color pickers for NGO theme fields", () => {
  assert.match(html, /name="primaryColor" type="color"/);
  assert.match(html, /name="secondaryColor" type="color"/);
});

test("styles include visible focus treatment and flash container state", () => {
  assert.match(css, /\.skip-link:focus-visible/);
  assert.match(css, /\.button:focus-visible/);
  assert.match(css, /\.flash:not\(:empty\)/);
});
