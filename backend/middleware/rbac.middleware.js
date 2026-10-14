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
 * Compute the effective permissions array for a membership, applying canonical role permissions
 * and custom permission overrides (where explicit deny wins).
 */
export const computeEffectivePermissions = (membership) => {
  if (!membership || !membership.role) return [];
  const basePerms = ROLE_PERMISSIONS[membership.role] || [];
  const customOverrides = membership.customPermissions || [];

  // If role is owner (wildcard), check if any explicit deny exists
  const deniedSet = new Set(
    customOverrides.filter((c) => c && c.granted === false).map((c) => c.permission)
  );

  const grantedSet = new Set(
    customOverrides.filter((c) => c && c.granted === true).map((c) => c.permission)
  );

  if (basePerms.includes("*")) {
    // If owner has no denies, returns wildcard
    if (deniedSet.size === 0) {
      return ["*"];
    }
  }

  // Combine base + granted custom permissions, excluding explicit denies
  const effective = new Set();
  for (const p of basePerms) {
    if (!deniedSet.has(p)) {
      effective.add(p);
    }
  }

  for (const p of grantedSet) {
    if (!deniedSet.has(p)) {
      effective.add(p);
    }
  }

  return Array.from(effective);
};

/**
 * Check whether a membership has a specific effective permission.
 * Explicit deny wins. Unknown or empty permissions fail closed.
 */
export const hasEffectivePermission = (membership, requiredPermission) => {
  if (!membership || !requiredPermission || typeof requiredPermission !== "string") {
    return false;
  }

  const customOverrides = membership.customPermissions || [];
  // 1. Explicit deny wins
  const explicitDeny = customOverrides.find(
    (c) => c && c.permission === requiredPermission && c.granted === false
  );
  if (explicitDeny) {
    return false;
  }

  // 2. Base role permissions
  const basePerms = ROLE_PERMISSIONS[membership.role] || [];
  if (basePerms.includes("*") || basePerms.includes(requiredPermission)) {
    return true;
  }

  // 3. Explicit grant in custom overrides
  const explicitGrant = customOverrides.find(
    (c) => c && c.permission === requiredPermission && c.granted === true
  );
  if (explicitGrant) {
    return true;
  }

  return false;
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

    if (!hasEffectivePermission(req.membership, requiredPermission)) {
      throw new ApiError(
        403,
        `Access Denied: Your account lacks the '${requiredPermission}' permission.`
      );
    }

    next();
  };
};
