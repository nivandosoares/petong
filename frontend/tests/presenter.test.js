"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  escapeHtml,
  renderAuthState,
  renderApplications,
  renderPets,
  renderTenantCards
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

test("renders guest auth state and tenant cards", () => {
  assert.match(renderAuthState(null), /Guest Mode/);
  assert.match(
    renderTenantCards([
      {
        tenant: {
          name: "Happy Paws",
          slug: "happy-paws",
          description: "Rescue collective"
        },
        membership: {
          role: "ngo_admin"
        }
      }
    ]),
    /Happy Paws/
  );
});
