import { Lead } from "../models/Lead.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * Middleware to enforce plan lead limits before creating or importing leads.
 * Now reads limits from the Organization (via req.organization) instead of User.
 */
export const checkLeadLimit = asyncHandler(async (req, res, next) => {
  const org = req.organization;
  if (!org) {
    throw new ApiError(500, "checkLeadLimit requires requireOrg middleware");
  }

  const leadLimit = org.leadLimit ?? 50;

  // Count existing active leads for this organization (excluding soft-deleted leads)
  const currentLeadCount = await Lead.countDocuments({
    organization: org._id,
    isDeleted: { $ne: true },
  });

  // If bulk import, check incoming batch length
  const incomingBatchSize = Array.isArray(req.body.leads) ? req.body.leads.length : 1;

  if (currentLeadCount + incomingBatchSize > leadLimit) {
    throw new ApiError(
      402,
      `Lead limit reached (${currentLeadCount}/${leadLimit} leads). Upgrade your RevFlux plan to add more leads.`
    );
  }

  next();
});
