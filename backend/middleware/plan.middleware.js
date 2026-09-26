import { Lead } from "../models/Lead.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * Middleware to enforce plan lead limits before creating or importing leads.
 */
export const checkLeadLimit = asyncHandler(async (req, res, next) => {
  const user = req.user;
  const leadLimit = user.leadLimit ?? 50;

  // Count existing active leads for this user
  const currentLeadCount = await Lead.countDocuments({ owner: user._id });

  // If bulk import, check incoming batch length
  const incomingBatchSize = Array.isArray(req.body.leads) ? req.body.leads.length : 1;

  if (currentLeadCount + incomingBatchSize > leadLimit && user.plan === "free") {
    throw new ApiError(
      402,
      `Lead limit reached (${currentLeadCount}/${leadLimit} leads). Upgrade your RevFlux plan to add more leads.`
    );
  }

  next();
});
