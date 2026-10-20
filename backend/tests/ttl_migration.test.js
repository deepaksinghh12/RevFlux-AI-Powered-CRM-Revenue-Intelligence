import { describe, it } from "node:test";
import assert from "node:assert";
import { inspectAndDropTTLIndexes } from "../scripts/migrate-drop-trash-ttl.js";

describe("TTL Index Migration Discovery & Safety Suite", () => {
  it("1. Identifies TTL indexes strictly by presence of expireAfterSeconds and ignores non-TTL deletedAt indexes", async () => {
    const droppedIndexes = [];

    const mockDb = {
      collection: (name) => {
        if (name === "leads") {
          return {
            indexes: async () => [
              { name: "_id_", key: { _id: 1 } },
              { name: "deletedAt_1", key: { deletedAt: 1 } }, // Non-TTL index! Should NOT be dropped!
              { name: "organization_1_isDeleted_1_deletedAt_-1", key: { organization: 1, isDeleted: 1, deletedAt: -1 } },
              { name: "custom_legacy_ttl", key: { deletedAt: 1 }, expireAfterSeconds: 2592000 }, // True TTL index!
            ],
            dropIndex: async (idxName) => droppedIndexes.push({ collection: name, index: idxName }),
          };
        }
        return {
          indexes: async () => [{ name: "_id_", key: { _id: 1 } }],
          dropIndex: async () => {},
        };
      },
    };

    // Dry-run mode
    const dryRunSummary = await inspectAndDropTTLIndexes({
      db: mockDb,
      dryRun: true,
      collections: ["leads"],
    });

    assert.strictEqual(droppedIndexes.length, 0, "Dry-run mode must never call dropIndex");
    
    const preserved = dryRunSummary.find((s) => s.indexName === "deletedAt_1");
    assert.ok(preserved, "Must consider the standard deletedAt_1 index");
    assert.strictEqual(preserved.action, "PRESERVED (Non-TTL index)");

    const wouldDrop = dryRunSummary.find((s) => s.indexName === "custom_legacy_ttl");
    assert.ok(wouldDrop, "Must identify custom-named TTL index");
    assert.strictEqual(wouldDrop.action, "WOULD DROP (TTL detected)");
    assert.strictEqual(wouldDrop.expireAfterSeconds, 2592000);

    // Execute mode
    const execSummary = await inspectAndDropTTLIndexes({
      db: mockDb,
      dryRun: false,
      collections: ["leads"],
    });

    assert.strictEqual(droppedIndexes.length, 1, "Only the true TTL index should be dropped");
    assert.strictEqual(droppedIndexes[0].index, "custom_legacy_ttl");

    const droppedReport = execSummary.find((s) => s.indexName === "custom_legacy_ttl");
    assert.strictEqual(droppedReport.action, "DROPPED SUCCESSFULLY");
  });

  it("2. Safely handles missing collections without throwing exceptions", async () => {
    const mockDb = {
      collection: () => ({
        indexes: async () => {
          const err = new Error("ns does not exist");
          err.code = 26;
          err.codeName = "NamespaceNotFound";
          throw err;
        },
      }),
    };

    const summary = await inspectAndDropTTLIndexes({
      db: mockDb,
      dryRun: true,
      collections: ["non_existent_col"],
    });

    assert.strictEqual(summary.length, 1);
    assert.strictEqual(summary[0].action, "COLLECTION NOT FOUND (Skipped)");
  });

  it("3. Reports clean when no TTL indexes exist on target collection", async () => {
    const mockDb = {
      collection: () => ({
        indexes: async () => [
          { name: "_id_", key: { _id: 1 } },
          { name: "organization_1_isDeleted_1_deletedAt_-1", key: { organization: 1, isDeleted: 1, deletedAt: -1 } },
        ],
      }),
    };

    const summary = await inspectAndDropTTLIndexes({
      db: mockDb,
      dryRun: true,
      collections: ["tasks"],
    });

    assert.strictEqual(summary.length, 2);
    assert.strictEqual(summary[0].action, "PRESERVED (Non-TTL index)");
    assert.strictEqual(summary[1].action, "NO TTL INDEX FOUND (Clean)");
  });
});
