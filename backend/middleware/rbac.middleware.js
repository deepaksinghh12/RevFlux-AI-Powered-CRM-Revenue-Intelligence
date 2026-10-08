import { ApiError } from "../utils/ApiError.js";
import { ROLE_PERMISSIONS } from "../config/permissions.js";

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

    if (!allowedRoles.includes(userRole)) {
      throw new ApiError(
        403,
        `Access Denied: Your active role (${userRole.toUpperCase()}) does not have permission.`
      );
    }

    next();
  };
};

/**
 * Granular Permission Check Middleware
 * Verifies the user's role grants the requested permission.
 */
export const requirePermission = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.membership) {
      throw new ApiError(500, "requirePermission must be used after requireOrg");
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
