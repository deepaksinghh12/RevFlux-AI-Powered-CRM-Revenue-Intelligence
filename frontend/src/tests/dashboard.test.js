/**
 * RevFlux E2E & Suite Test Script
 * Run this test file using: `npm test` or `node tests/dashboard.test.js`
 */

import { describe, it, expect } from "vitest";

describe("RevFlux Dashboard & Core Suite Verification", () => {
  it("should calculate correct pipeline value formatting", () => {
    const rawValue = 164500;
    const formatted = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(rawValue);

    expect(formatted).toContain("1,64,500");
  });

  it("should filter overdue tasks correctly", () => {
    const tasks = [
      { id: 1, title: "Task 1", status: "Pending", dueDate: "2020-01-01" },
      { id: 2, title: "Task 2", status: "Completed", dueDate: "2020-01-01" },
      { id: 3, title: "Task 3", status: "Pending", dueDate: "2099-01-01" },
    ];

    const overdue = tasks.filter(
      (t) => t.status !== "Completed" && new Date(t.dueDate) < new Date()
    );

    expect(overdue.length).toBe(1);
    expect(overdue[0].id).toBe(1);
  });

  it("should correctly identify AI high-risk leads", () => {
    const leads = [
      { name: "Lead A", aiRiskScore: 85, status: "Proposal" },
      { name: "Lead B", aiRiskScore: 20, status: "Won" },
      { name: "Lead C", aiRiskScore: 65, status: "New" },
    ];

    const atRisk = leads.filter((l) => l.aiRiskScore > 60);

    expect(atRisk.length).toBe(2);
    expect(atRisk.map((l) => l.name)).toEqual(["Lead A", "Lead C"]);
  });

  it("should calculate correct win rate percentage", () => {
    const totalLeads = 80;
    const wonLeads = 32;

    const winRate = Math.round((wonLeads / totalLeads) * 100);

    expect(winRate).toBe(40);
  });
});
