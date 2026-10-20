import cron from "node-cron";
import Lead from "../models/Lead.js";
import { Contact } from "../models/Contact.js";
import { Task } from "../models/Task.js";
import { Note } from "../models/Note.js";

/**
 * Permanently purge soft-deleted records older than the retention window.
 * Idempotent, safe, and returns summary counts.
 * 
 * @param {Object} [options]
 * @param {number} [options.retentionDays=30]
 * @param {string|mongoose.Types.ObjectId} [options.organizationId]
 * @returns {Promise<{ leads: number, contacts: number, tasks: number, notes: number }>}
 */
export const runTrashCleanup = async ({ retentionDays = 30, organizationId } = {}) => {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const baseFilter = {
    isDeleted: true,
    deletedAt: { $lt: cutoff },
  };

  if (organizationId) {
    baseFilter.organization = organizationId;
  }

  const results = {
    leads: 0,
    contacts: 0,
    tasks: 0,
    notes: 0,
  };

  try {
    // 1. Permanently remove expired Notes
    const notesRes = await Note.deleteMany(baseFilter);
    results.notes = notesRes.deletedCount || 0;

    // 2. Permanently remove expired Tasks
    const tasksRes = await Task.deleteMany(baseFilter);
    results.tasks = tasksRes.deletedCount || 0;

    // 3. Permanently remove expired Contacts (and unlink any remaining Note/Task references)
    const expiredContacts = await Contact.find(baseFilter).select("_id");
    if (expiredContacts.length > 0) {
      const contactIds = expiredContacts.map((c) => c._id);
      await Note.updateMany({ contact: { $in: contactIds } }, { $set: { contact: null } });
      await Task.updateMany({ relatedContact: { $in: contactIds } }, { $set: { relatedContact: null } });
      const contactsRes = await Contact.deleteMany({ _id: { $in: contactIds } });
      results.contacts = contactsRes.deletedCount || 0;
    }

    // 4. Permanently remove expired Leads (and cascade delete notes tied to them)
    const expiredLeads = await Lead.find(baseFilter).select("_id");
    if (expiredLeads.length > 0) {
      const leadIds = expiredLeads.map((l) => l._id);
      await Note.deleteMany({ lead: { $in: leadIds } });
      await Task.updateMany({ relatedLead: { $in: leadIds } }, { $set: { relatedLead: null } });
      const leadsRes = await Lead.deleteMany({ _id: { $in: leadIds } });
      results.leads = leadsRes.deletedCount || 0;
    }
  } catch (err) {
    console.error("[TrashCleanup] Error executing permanent purge:", err);
    throw err;
  }

  return results;
};

let isScheduled = false;

/**
 * Schedule automated daily cleanup job at 02:00 AM UTC.
 * 
 * NOTE: The `isScheduled` guard prevents duplicate cron listener registration
 * within the current Node.js process runtime. In multi-instance / horizontally scaled
 * deployments (e.g. multiple Render web instances), each process will run this job
 * unless isolated to a dedicated background worker service or coordinated via a
 * distributed lock.
 */
export const startTrashCleanupJob = () => {
  if (isScheduled) {
    console.log("[Cron] Trash cleanup job is already scheduled in this process. Skipping duplicate registration.");
    return false;
  }
  isScheduled = true;

  cron.schedule(
    "0 2 * * *",
    async () => {
      console.log("[Cron] Running daily trash retention cleanup (30-day purge)...");
      try {
        const summary = await runTrashCleanup();
        console.log("[Cron] Trash retention cleanup complete:", summary);
      } catch (err) {
        console.error("[Cron] Failed to run trash cleanup:", err);
      }
    },
    { timezone: "UTC" }
  );

  return true;
};

/**
 * Reset scheduling flag (for unit test verification only).
 */
export const _resetScheduleStateForTesting = () => {
  isScheduled = false;
};

export default { runTrashCleanup, startTrashCleanupJob, _resetScheduleStateForTesting };
