/**
 * Zero-dependency API validation schemas for Auth, Leads, and Subscriptions.
 */

function isEmail(str) {
  return typeof str === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str.trim());
}

export const authSchemas = {
  register: (data) => {
    const errors = [];
    if (!data.name || typeof data.name !== "string" || !data.name.trim()) {
      errors.push({ field: "name", message: "Full name is required" });
    }
    if (!data.email || !isEmail(data.email)) {
      errors.push({ field: "email", message: "A valid email address is required" });
    }
    if (!data.password || typeof data.password !== "string" || data.password.length < 6) {
      errors.push({ field: "password", message: "Password must be at least 6 characters long" });
    }
    return { success: errors.length === 0, errors };
  },

  login: (data) => {
    const errors = [];
    if (!data.email || !isEmail(data.email)) {
      errors.push({ field: "email", message: "A valid email address is required" });
    }
    if (!data.password || typeof data.password !== "string" || !data.password) {
      errors.push({ field: "password", message: "Password is required" });
    }
    return { success: errors.length === 0, errors };
  },

  subscribe: (data) => {
    const errors = [];
    const validPlans = ["free", "starter", "growth", "business"];
    if (!data.plan || !validPlans.includes(data.plan)) {
      errors.push({ field: "plan", message: `Plan must be one of: ${validPlans.join(", ")}` });
    }
    return { success: errors.length === 0, errors };
  },
};

export const leadSchemas = {
  create: (data) => {
    const errors = [];
    if (!data.name || typeof data.name !== "string" || !data.name.trim()) {
      errors.push({ field: "name", message: "Lead name is required" });
    }
    if (data.email && !isEmail(data.email)) {
      errors.push({ field: "email", message: "Must provide a valid email format" });
    }
    if (data.value !== undefined && (isNaN(Number(data.value)) || Number(data.value) < 0)) {
      errors.push({ field: "value", message: "Deal value must be a non-negative number" });
    }
    return { success: errors.length === 0, errors };
  },
};
