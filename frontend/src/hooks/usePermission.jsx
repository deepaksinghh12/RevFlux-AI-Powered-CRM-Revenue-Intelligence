import React from "react";
import { useAuth } from "../context/AuthContext";

/**
 * Hook to verify if the currently active workspace role has a specific permission.
 * Fails closed if user, activeOrg, or requiredPermission is undefined.
 */
export function usePermission() {
  const { user, activeOrg } = useAuth();

  const hasPermission = (permission) => {
    if (!permission || typeof permission !== "string") return false;
    if (user?.isSuperAdmin) return true;
    if (!activeOrg) return false;

    // Owner role always grants wildcard
    if (activeOrg.role === "owner") return true;

    const permissions = activeOrg.permissions || [];
    return permissions.includes("*") || permissions.includes(permission);
  };

  const hasAnyPermission = (...perms) => {
    return perms.some((p) => hasPermission(p));
  };

  const hasAllPermissions = (...perms) => {
    return perms.every((p) => hasPermission(p));
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    role: activeOrg?.role || "viewer",
  };
}

/**
 * Component wrapper that renders its children only if the active workspace has the permission.
 * Renders fallback (if provided) when unauthorized.
 */
export function Can({ perform, children, fallback = null }) {
  const { hasPermission } = usePermission();

  if (!hasPermission(perform)) {
    return fallback;
  }

  return <>{children}</>;
}

export default usePermission;
