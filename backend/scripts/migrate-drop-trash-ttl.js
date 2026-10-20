import "dotenv/config";
import mongoose from "mongoose";

/**
 * Migration Script: Safely drop legacy TTL indexes on deletedAt
 * 
 * In RevFlux v1.1.0 and earlier, collections had TTL indexes with expireAfterSeconds.
 * In v1.2.0, retention is handled through application-level cutoff enforcement and
 * an idempotent scheduled background job (backend/jobs/trashCleanup.js) to guarantee
 * a reliable 30-day recovery window without abrupt physical deletions.
 * 
 * Usage:
 *   node scripts/migrate-drop-trash-ttl.js           # Dry-run (Default)
 *   node scripts/migrate-drop-trash-ttl.js --execute # Apply index drop
 */

export const TARGET_COLLECTIONS = ["leads", "contacts", "tasks", "notes"];

/**
 * Inspect indexes on target collections and drop only true TTL indexes on deletedAt.
 * 
 * @param {Object} params
 * @param {import("mongodb").Db} params.db - Connected MongoDB Db instance
 * @param {boolean} [params.dryRun=true] - Whether to simulate without dropping
 * @param {string[]} [params.collections] - Collections to inspect
 * @param {Object} [params.logger=console] - Logger implementation
 * @returns {Promise<Array<{ collection: string, indexName: string, action: string, expireAfterSeconds?: number, reason?: string }>>}
 */
export async function inspectAndDropTTLIndexes({
  db,
  dryRun = true,
  collections = TARGET_COLLECTIONS,
  logger = console,
} = {}) {
  const summary = [];

  for (const colName of collections) {
    try {
      const col = db.collection(colName);
      let indexes = [];

      try {
        indexes = await col.indexes();
      } catch (err) {
        // Handle case where collection doesn't exist yet in the database
        if (err.code === 26 || err.codeName === "NamespaceNotFound" || err.message?.includes("ns does not exist")) {
          summary.push({
            collection: colName,
            indexName: "N/A",
            action: "COLLECTION NOT FOUND (Skipped)",
            reason: "Collection does not exist in database yet",
          });
          continue;
        }
        throw err;
      }

      let ttlFound = false;

      for (const idx of indexes) {
        const isTTL = idx.expireAfterSeconds !== undefined;
        const targetsDeletedAt = Boolean(idx.key && idx.key.deletedAt);

        if (isTTL && targetsDeletedAt) {
          ttlFound = true;
          if (dryRun) {
            summary.push({
              collection: colName,
              indexName: idx.name,
              action: "WOULD DROP (TTL detected)",
              expireAfterSeconds: idx.expireAfterSeconds,
              reason: `TTL index on deletedAt with expireAfterSeconds=${idx.expireAfterSeconds}`,
            });
          } else {
            await col.dropIndex(idx.name);
            summary.push({
              collection: colName,
              indexName: idx.name,
              action: "DROPPED SUCCESSFULLY",
              expireAfterSeconds: idx.expireAfterSeconds,
              reason: "Legacy TTL index safely removed",
            });
          }
        } else if (targetsDeletedAt && !isTTL) {
          // Standard B-tree or compound index on deletedAt - MUST NEVER DROP
          summary.push({
            collection: colName,
            indexName: idx.name,
            action: "PRESERVED (Non-TTL index)",
            reason: "Index contains deletedAt but has no expireAfterSeconds (Standard B-tree)",
          });
        }
      }

      if (!ttlFound) {
        summary.push({
          collection: colName,
          indexName: "None",
          action: "NO TTL INDEX FOUND (Clean)",
          reason: "No legacy expireAfterSeconds index detected on deletedAt",
        });
      }
    } catch (err) {
      summary.push({
        collection: colName,
        indexName: "Unknown",
        action: `ERROR: ${err.message}`,
        reason: err.stack,
      });
    }
  }

  return summary;
}

export async function main() {
  const isExecute = process.argv.includes("--execute");
  const dryRun = !isExecute;

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("ERROR: MONGO_URI is not set in environment.");
    process.exit(1);
  }

  const lower = mongoUri.toLowerCase();
  const env = (process.env.NODE_ENV || "").toLowerCase();
  if ((lower.includes("prod") || env.includes("prod")) && !process.env.ALLOW_PROD_MIGRATION) {
    console.error("SAFETY ERROR: Cannot run migration script against a production database without ALLOW_PROD_MIGRATION=true.");
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  const db = mongoose.connection.db;
  console.log(`[TTL Migration] Connected to database: ${mongoose.connection.name}`);
  console.log(`[TTL Migration] Mode: ${dryRun ? "DRY-RUN (Default - No changes applied)" : "EXECUTE (Dropping legacy TTL indexes)"}`);

  const summary = await inspectAndDropTTLIndexes({ db, dryRun });

  console.log("\n================ MIGRATION SUMMARY ================");
  console.table(summary.map(({ collection, indexName, action, expireAfterSeconds }) => ({
    collection,
    indexName,
    action,
    expireAfterSeconds: expireAfterSeconds ?? "N/A",
  })));
  console.log("===================================================\n");

  if (dryRun) {
    console.log("[INFO] Dry-run complete. Run with '--execute' to apply index drops.");
  } else {
    console.log("[SUCCESS] Legacy TTL indexes successfully dropped.");
  }

  await mongoose.disconnect();
}

// Only execute when called directly from CLI
if (import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, "/")}` || process.argv[1]?.endsWith("migrate-drop-trash-ttl.js")) {
  main().catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
}
