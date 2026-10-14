import { ApiError } from "../utils/apiError.js";
import { ROLE_PERMISSIONS } from "../config/permissions.js";

const CANONICAL_ROLES = ["owner", "admin", "manager", "rep", "viewer"];

/**
 * Basic Role Check Middleware
 * Note: prefer requirePermission for granular action checks.
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.membership) {
      throw new ApiError(500, "requireRole must be used after requireOrg");
    }

    // A platform superadmin conceptually bypasses org checks (optional, but implemented as requested)
    if (req.user && req.user.isSuperAdmin) {
      return next();
    }

    const userRole = req.membership.role;

    if (!CANONICAL_ROLES.includes(userRole) || !allowedRoles.includes(userRole)) {
      throw new ApiError(
        403,
        `Access Denied: Your active role (${(userRole || "unknown").toUpperCase()}) does not have permission.`
      );
    }

    next();
  };
};

/**
 * Granular Permission Check Middleware
 * Verifies the user's role grants the requested permission.
 * Fails closed on undefined or unknown permissions.
 */
export const requirePermission = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.membership) {
      throw new ApiError(500, "requirePermission must be used after requireOrg");
    }

    // Fail closed immediately if requiredPermission is undefined, null, or empty string
    if (!requiredPermission || typeof requiredPermission !== "string") {
      throw new ApiError(403, "Access Denied: Unrecognized or undefined permission required.");
    }

    if (req.user && req.user.isSuperAdmin) {
      return next();
    }

    const userRole = req.membership.role;
    const permissions = ROLE_PERMISSIONS[userRole] || [];

    if (!permissions.includes("*") && !permissions.includes(requiredPermission)) {
      throw new ApiError(
        403,
        `Access Denied: Your role (${userRole}) lacks the '${requiredPermission}' permission.`
      );
    }

    next();
  };
};
