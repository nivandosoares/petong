"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  escapeHtml,
  renderApplications,
  renderPets
} = require("../presenter");

test("escapes HTML-special characters", () => {
  assert.equal(escapeHtml('<script>alert("x")</script>'), "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
});

test("renders an empty pets state", () => {
  assert.match(renderPets([]), /No pets registered/);
});

test("renders pet cards", () => {
  const html = renderPets([
    {
      id: "pet_1",
      name: "Luna",
      species: "dog",
      ageGroup: "adult",
      status: "available"
    }
  ]);

  assert.match(html, /Luna/);
  assert.match(html, /available/);
  assert.match(html, /Pet ID: pet_1/);
});

test("renders approval buttons only for submitted applications", () => {
  const html = renderApplications([
    {
      id: "application_1",
      adopterName: "Sam",
      petId: "pet_1",
      status: "submitted"
    },
    {
      id: "application_2",
      adopterName: "Riley",
      petId: "pet_2",
      status: "approved"
    }
  ]);

  assert.match(html, /data-approve-id="application_1"/);
  assert.doesNotMatch(html, /data-approve-id="application_2"/);
});
