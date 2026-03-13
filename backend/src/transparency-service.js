"use strict";

const { NotFoundError, TenantMismatchError, ValidationError } = require("./adoption-service");

class TransparencyService {
  constructor(options = {}) {
    this.store = options.store ?? null;
    this.campaigns = new Map();
    this.donations = new Map();
    this.expenses = new Map();
    this.sequence = {
      campaign: 0,
      donation: 0,
      expense: 0
    };

    this.#hydrate();
  }

  createCampaign(input) {
    assertRequired(input, ["tenantId", "name", "goalAmount"]);

    const campaign = {
      id: this.#nextId("campaign"),
      tenantId: input.tenantId,
      name: input.name,
      description: input.description ?? "",
      goalAmount: normalizeAmount(input.goalAmount),
      status: input.status ?? "active",
      createdAt: new Date().toISOString()
    };

    this.campaigns.set(campaign.id, campaign);
    this.#persist();
    return { ...campaign };
  }

  listCampaignsByTenant(tenantId) {
    return Array.from(this.campaigns.values())
      .filter((campaign) => campaign.tenantId === tenantId)
      .map((campaign) => this.#buildCampaignSummary(campaign));
  }

  recordDonation(input) {
    assertRequired(input, ["tenantId", "amount"]);
    const donation = {
      id: this.#nextId("donation"),
      tenantId: input.tenantId,
      campaignId: input.campaignId ?? "",
      donorName: input.donorName?.trim() || "Anonymous donor",
      amount: normalizeAmount(input.amount),
      note: input.note ?? "",
      receivedAt: input.receivedAt ?? new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    this.#assertCampaignOwnership(donation.tenantId, donation.campaignId);
    this.donations.set(donation.id, donation);
    this.#persist();
    return { ...donation };
  }

  recordExpense(input) {
    assertRequired(input, ["tenantId", "amount", "description"]);
    const expense = {
      id: this.#nextId("expense"),
      tenantId: input.tenantId,
      campaignId: input.campaignId ?? "",
      category: input.category ?? "general_care",
      description: input.description,
      amount: normalizeAmount(input.amount),
      spentAt: input.spentAt ?? new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    this.#assertCampaignOwnership(expense.tenantId, expense.campaignId);
    this.expenses.set(expense.id, expense);
    this.#persist();
    return { ...expense };
  }

  listDonationsByTenant(tenantId) {
    return Array.from(this.donations.values())
      .filter((donation) => donation.tenantId === tenantId)
      .sort(compareNewestFirst("receivedAt"))
      .map((donation) => ({ ...donation }));
  }

  listExpensesByTenant(tenantId) {
    return Array.from(this.expenses.values())
      .filter((expense) => expense.tenantId === tenantId)
      .sort(compareNewestFirst("spentAt"))
      .map((expense) => ({ ...expense }));
  }

  getTransparencySummary(tenantId) {
    const campaigns = this.listCampaignsByTenant(tenantId);
    const donations = this.listDonationsByTenant(tenantId);
    const expenses = this.listExpensesByTenant(tenantId);
    const totalRaised = donations.reduce((sum, donation) => sum + donation.amount, 0);
    const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);

    return {
      tenantId,
      totals: {
        totalRaised,
        totalSpent,
        balance: totalRaised - totalSpent,
        donationCount: donations.length,
        expenseCount: expenses.length,
        campaignCount: campaigns.length
      },
      campaigns,
      recentDonations: donations.slice(0, 5),
      recentExpenses: expenses.slice(0, 5)
    };
  }

  exportState() {
    return {
      sequence: { ...this.sequence },
      campaigns: Array.from(this.campaigns.values()).map((campaign) => ({ ...campaign })),
      donations: Array.from(this.donations.values()).map((donation) => ({ ...donation })),
      expenses: Array.from(this.expenses.values()).map((expense) => ({ ...expense }))
    };
  }

  #buildCampaignSummary(campaign) {
    const raised = this.listDonationsByTenant(campaign.tenantId)
      .filter((donation) => donation.campaignId === campaign.id)
      .reduce((sum, donation) => sum + donation.amount, 0);
    const spent = this.listExpensesByTenant(campaign.tenantId)
      .filter((expense) => expense.campaignId === campaign.id)
      .reduce((sum, expense) => sum + expense.amount, 0);

    return {
      ...campaign,
      raisedAmount: raised,
      spentAmount: spent,
      balance: raised - spent,
      progressRatio: campaign.goalAmount > 0 ? Math.min(raised / campaign.goalAmount, 1) : 0
    };
  }

  #assertCampaignOwnership(tenantId, campaignId) {
    if (!campaignId) {
      return;
    }

    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      throw new NotFoundError(`Campaign ${campaignId} was not found`);
    }

    if (campaign.tenantId !== tenantId) {
      throw new TenantMismatchError("Campaign does not belong to the provided tenant");
    }
  }

  #nextId(kind) {
    this.sequence[kind] += 1;
    return `${kind}_${this.sequence[kind]}`;
  }

  #hydrate() {
    if (!this.store) {
      return;
    }

    const state = this.store.load();
    if (!state) {
      return;
    }

    this.sequence = {
      campaign: Number(state.sequence?.campaign ?? 0),
      donation: Number(state.sequence?.donation ?? 0),
      expense: Number(state.sequence?.expense ?? 0)
    };
    this.campaigns = new Map((state.campaigns ?? []).map((campaign) => [campaign.id, { ...campaign }]));
    this.donations = new Map((state.donations ?? []).map((donation) => [donation.id, { ...donation }]));
    this.expenses = new Map((state.expenses ?? []).map((expense) => [expense.id, { ...expense }]));
  }

  #persist() {
    if (!this.store) {
      return;
    }

    this.store.save(this.exportState());
  }
}

function assertRequired(input, fields) {
  for (const field of fields) {
    if (!input || input[field] === undefined || input[field] === null || input[field] === "") {
      throw new ValidationError(`Field ${field} is required`);
    }
  }
}

function normalizeAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ValidationError("Amount must be a positive number");
  }

  return Number(amount.toFixed(2));
}

function compareNewestFirst(field) {
  return (left, right) => String(right[field]).localeCompare(String(left[field]));
}

module.exports = {
  TransparencyService
};
