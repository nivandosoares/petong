"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const { JsonFileStore } = require("../src/file-store");
const { TenantMismatchError, ValidationError } = require("../src/adoption-service");
const { TransparencyService } = require("../src/transparency-service");

test("creates tenant-scoped campaigns and computes campaign progress", () => {
  const service = new TransparencyService();
  const campaign = service.createCampaign({
    tenantId: "ngo_red",
    name: "Surgery Fund",
    description: "Emergency procedures",
    goalAmount: 1000
  });

  service.recordDonation({
    tenantId: "ngo_red",
    campaignId: campaign.id,
    donorName: "Ana",
    amount: 250
  });
  service.recordExpense({
    tenantId: "ngo_red",
    campaignId: campaign.id,
    category: "medical",
    description: "Initial treatment",
    amount: 100
  });

  const summary = service.getTransparencySummary("ngo_red");

  assert.equal(summary.totals.totalRaised, 250);
  assert.equal(summary.totals.totalSpent, 100);
  assert.equal(summary.campaigns[0].progressRatio, 0.25);
});

test("rejects donations linked to campaigns from other tenants", () => {
  const service = new TransparencyService();
  const campaign = service.createCampaign({
    tenantId: "ngo_red",
    name: "Kennel Upgrade",
    goalAmount: 500
  });

  assert.throws(
    () =>
      service.recordDonation({
        tenantId: "ngo_blue",
        campaignId: campaign.id,
        amount: 50
      }),
    TenantMismatchError
  );
});

test("validates positive amounts for transparency records", () => {
  const service = new TransparencyService();

  assert.throws(
    () =>
      service.createCampaign({
        tenantId: "ngo_red",
        name: "Invalid Goal",
        goalAmount: 0
      }),
    ValidationError
  );
});

test("persists campaigns, donations, and expenses across restarts", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "petong-transparency-"));
  const dataFile = path.join(tempDir, "transparency.json");

  try {
    const first = new TransparencyService({
      store: new JsonFileStore(dataFile)
    });
    const campaign = first.createCampaign({
      tenantId: "ngo_red",
      name: "Food Drive",
      goalAmount: 300
    });
    first.recordDonation({
      tenantId: "ngo_red",
      campaignId: campaign.id,
      amount: 125
    });

    const second = new TransparencyService({
      store: new JsonFileStore(dataFile)
    });

    assert.equal(second.listCampaignsByTenant("ngo_red").length, 1);
    assert.equal(second.getTransparencySummary("ngo_red").totals.totalRaised, 125);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
