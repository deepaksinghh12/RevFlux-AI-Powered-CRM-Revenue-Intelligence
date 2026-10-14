/**
 * RevFlux Centralized Email Configuration & Sender Registry
 * Verified domain: revflux.deepaksinghdev.in
 */

export const SENDER_DOMAIN = "revflux.deepaksinghdev.in";

export const EMAIL_CATEGORIES = Object.freeze({
  SECURITY: "SECURITY",
  ONBOARDING: "ONBOARDING",
  NOTIFICATIONS: "NOTIFICATIONS",
  BILLING: "BILLING",
  SUPPORT: "SUPPORT",
  UPDATES: "UPDATES",
  GENERAL: "GENERAL",
  REPORTS: "REPORTS",
});

export const SENDER_REGISTRY = Object.freeze({
  [EMAIL_CATEGORIES.SECURITY]: {
    category: EMAIL_CATEGORIES.SECURITY,
    displayName: "RevFlux Security",
    address: `security@${SENDER_DOMAIN}`,
    envVar: "RESEND_SECURITY_FROM_EMAIL",
    purpose: "OTP, authentication and security-related transactional emails",
  },
  [EMAIL_CATEGORIES.ONBOARDING]: {
    category: EMAIL_CATEGORIES.ONBOARDING,
    displayName: "RevFlux Team",
    address: `onboarding@${SENDER_DOMAIN}`,
    envVar: "RESEND_ONBOARDING_FROM_EMAIL",
    purpose: "Welcome emails, account onboarding and organization invitations",
  },
  [EMAIL_CATEGORIES.NOTIFICATIONS]: {
    category: EMAIL_CATEGORIES.NOTIFICATIONS,
    displayName: "RevFlux Notifications",
    address: `notifications@${SENDER_DOMAIN}`,
    envVar: "RESEND_NOTIFICATIONS_FROM_EMAIL",
    purpose: "CRM alerts, task reminders, assignments and activity notifications",
  },
  [EMAIL_CATEGORIES.BILLING]: {
    category: EMAIL_CATEGORIES.BILLING,
    displayName: "RevFlux Billing",
    address: `billing@${SENDER_DOMAIN}`,
    envVar: "RESEND_BILLING_FROM_EMAIL",
    purpose: "Billing and subscription lifecycle emails",
  },
  [EMAIL_CATEGORIES.SUPPORT]: {
    category: EMAIL_CATEGORIES.SUPPORT,
    displayName: "RevFlux Support",
    address: `support@${SENDER_DOMAIN}`,
    envVar: "RESEND_SUPPORT_FROM_EMAIL",
    purpose: "Customer support communication",
  },
  [EMAIL_CATEGORIES.UPDATES]: {
    category: EMAIL_CATEGORIES.UPDATES,
    displayName: "RevFlux Updates",
    address: `updates@${SENDER_DOMAIN}`,
    envVar: "RESEND_UPDATES_FROM_EMAIL",
    purpose: "Product announcements and optional product updates",
  },
  [EMAIL_CATEGORIES.GENERAL]: {
    category: EMAIL_CATEGORIES.GENERAL,
    displayName: "RevFlux Team",
    address: `hello@${SENDER_DOMAIN}`,
    envVar: "RESEND_GENERAL_FROM_EMAIL",
    purpose: "General enquiries and partnership communication",
  },
  [EMAIL_CATEGORIES.REPORTS]: {
    category: EMAIL_CATEGORIES.REPORTS,
    displayName: "RevFlux Reports",
    address: `reports@${SENDER_DOMAIN}`,
    envVar: "RESEND_REPORTS_FROM_EMAIL",
    purpose: "Scheduled reports, CRM summaries and AI-generated digests",
  },
});

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates an email address.
 * @param {string} email
 * @returns {boolean}
 */
export const isValidEmail = (email) => {
  return typeof email === "string" && EMAIL_REGEX.test(email.trim());
};

/**
 * Resolves and validates the formatted sender string for a given category.
 * Supports environment variable overrides in both "Display Name <email@domain>" and "email@domain" formats.
 * Throws explicit errors on unknown categories or malformed configurations to prevent silent misdirection.
 *
 * @param {string} category
 * @returns {string} Formatted sender string, e.g. "RevFlux Security <security@revflux.deepaksinghdev.in>"
 */
export const getSender = (category) => {
  if (!category || typeof category !== "string") {
    throw new Error(`Email category must be a non-empty string. Received: ${category}`);
  }

  const normalizedCategory = category.toUpperCase().trim();
  const identity = SENDER_REGISTRY[normalizedCategory];

  if (!identity) {
    const validCategories = Object.keys(EMAIL_CATEGORIES).join(", ");
    throw new Error(
      `Unknown email category "${category}". Valid categories are: ${validCategories}`
    );
  }

  const envOverride = process.env[identity.envVar];

  if (envOverride !== undefined && envOverride !== null) {
    const trimmed = envOverride.trim();

    if (!trimmed) {
      throw new Error(
        `Invalid sender configuration: environment variable ${identity.envVar} is set but empty.`
      );
    }

    // Check if format is "Display Name <email@domain>"
    const angleBracketMatch = trimmed.match(/^([^<]+)<([^>]+)>$/);
    if (angleBracketMatch) {
      const customName = angleBracketMatch[1].trim();
      const customEmail = angleBracketMatch[2].trim();

      if (!customName || !isValidEmail(customEmail)) {
        throw new Error(
          `Invalid sender configuration in ${identity.envVar}: "${trimmed}". Must be a valid email or "Name <email@domain>".`
        );
      }

      return `${customName} <${customEmail}>`;
    }

    // Direct email address provided
    if (isValidEmail(trimmed)) {
      return `${identity.displayName} <${trimmed}>`;
    }

    throw new Error(
      `Invalid sender configuration in ${identity.envVar}: "${trimmed}". Must be a valid email or "Name <email@domain>".`
    );
  }

  // Return default formatted identity
  return `${identity.displayName} <${identity.address}>`;
};

/**
 * Returns all configured sender identities with resolved formatted values.
 * @returns {Record<string, { category: string, displayName: string, address: string, formatted: string, envVar: string, purpose: string }>}
 */
export const getAllSenders = () => {
  const result = {};
  for (const [cat, config] of Object.entries(SENDER_REGISTRY)) {
    result[cat] = {
      ...config,
      formatted: getSender(cat),
    };
  }
  return result;
};
