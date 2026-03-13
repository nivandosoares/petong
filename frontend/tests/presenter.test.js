"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  escapeHtml,
  renderAuthState,
  renderApplications,
  renderDiscoveryMatches,
  renderDonationCards,
  renderExpenseCards,
  renderMyApplications,
  renderPublicPetCards,
  renderPublicTenant,
  renderPets,
  renderTransparencySummary,
  renderCampaignCards,
  renderTenantCards,
  renderTenantEditor
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

test("renders review buttons only for pending and under-review applications", () => {
  const html = renderApplications([
    {
      id: "application_1",
      adopterName: "Sam",
      petId: "pet_1",
      message: "Ready to adopt",
      statusHistory: [{ status: "pending" }],
      status: "pending"
    },
    {
      id: "application_2",
      adopterName: "Riley",
      petId: "pet_2",
      message: "",
      statusHistory: [{ status: "pending" }, { status: "approved" }],
      status: "approved"
    }
  ]);

  assert.match(html, /data-review-id="application_1"/);
  assert.doesNotMatch(html, /data-review-id="application_2"/);
  assert.match(html, /Ready to adopt/);
});

test("renders applicant-facing applications", () => {
  const html = renderMyApplications([
    {
      id: "application_1",
      adopterName: "Sam",
      petId: "pet_1",
      message: "Quiet apartment and remote work.",
      status: "under_review"
    }
  ]);

  assert.match(html, /under_review/);
  assert.match(html, /Quiet apartment and remote work/);
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

test("renders tenant editor and public landing", () => {
  assert.match(
    renderTenantEditor({
      tenant: {
        name: "Happy Paws",
        slug: "happy-paws",
        primaryColor: "#111111",
        secondaryColor: "#222222"
      },
      membership: {
        role: "ngo_admin"
      }
    }),
    /happy-paws/
  );

  assert.match(
    renderPublicTenant(
      {
        name: "Happy Paws",
        description: "Rescue collective",
        primaryColor: "#111111",
        secondaryColor: "#222222",
        logo: ""
      },
      {
        totals: {
          totalRaised: 1250,
          totalSpent: 340,
          balance: 910,
          campaignCount: 1
        },
        campaigns: []
      }
    ),
    /Transparency Dashboard/
  );

  assert.match(
    renderPublicPetCards([
      {
        name: "Luna",
        species: "dog",
        city: "Sao Paulo",
        size: "medium",
        description: "Friendly"
      }
    ]),
    /Luna/
  );

  assert.match(
    renderDiscoveryMatches([
      {
        name: "Luna",
        species: "dog",
        city: "Sao Paulo",
        compatibilityScore: 8,
        compatibilityNotes: ["same city", "matches preferred size"]
      }
    ]),
    /Score 8/
  );
});

test("renders transparency cards", () => {
  assert.match(
    renderTransparencySummary({
      totals: {
        totalRaised: 1000,
        totalSpent: 400,
        balance: 600,
        campaignCount: 1
      },
      campaigns: [
        {
          id: "campaign_1",
          name: "Medical Care",
          status: "active",
          description: "Emergency support",
          raisedAmount: 1000,
          goalAmount: 1500,
          spentAmount: 400,
          balance: 600
        }
      ]
    }),
    /Medical Care/
  );

  assert.match(
    renderCampaignCards([
      {
        id: "campaign_1",
        name: "Medical Care",
        status: "active",
        description: "Emergency support",
        raisedAmount: 1000,
        goalAmount: 1500,
        spentAmount: 400,
        balance: 600
      }
    ]),
    /Campaign ID: campaign_1/
  );

  assert.match(
    renderDonationCards([
      {
        id: "donation_1",
        donorName: "Ana",
        amount: 100,
        campaignId: "campaign_1",
        note: "Monthly support"
      }
    ]),
    /Monthly support/
  );

  assert.match(
    renderExpenseCards([
      {
        id: "expense_1",
        description: "Vaccines",
        amount: 40,
        category: "medical",
        campaignId: "campaign_1"
      }
    ]),
    /Vaccines/
  );
});
