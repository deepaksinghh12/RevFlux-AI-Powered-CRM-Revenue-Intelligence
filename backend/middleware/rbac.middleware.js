import { ApiError } from "../utils/ApiError.js";

/**
 * RBAC Role Authorization Middleware
 * Enforces allowed roles for target API endpoints.
 * Super Admin (superadmin) automatically bypasses role checks.
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new ApiError(401, "Authentication required");
    }

    const userRole = req.user.role || "owner";

    // Super Admin has full platform access across all routes
    if (userRole === "superadmin") {
      return next();
    }

    if (!allowedRoles.includes(userRole)) {
      throw new ApiError(
        403,
        `Access Denied: Your active RBAC role (${userRole.toUpperCase()}) does not have permission to execute this operation.`
      );
    }

    next();
  };
};

/**
 * Permission Map for granular frontend / backend authorization checks
 */
export const PERMISSION_MATRIX = {
  superadmin: ["all"],
  owner: [
    "manage_billing",
    "manage_team_roles",
    "delete_leads",
    "export_backups",
    "manage_cadences",
    "ai_features",
  ],
  ops_head: [
    "manage_team",
    "csv_ingestion",
    "manage_cadences",
    "export_backups",
    "ai_features",
  ],
  manager: [
    "pipeline_control",
    "assign_tasks",
    "manage_cadences",
    "view_analytics",
    "ai_features",
  ],
  rep: [
    "own_leads",
    "log_notes",
    "complete_tasks",
    "ai_email_drafting",
  ],
};
