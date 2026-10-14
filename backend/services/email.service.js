import { Resend } from "resend";
import logger from "../config/logger.js";
import { EMAIL_CATEGORIES, getSender } from "../config/email.config.js";

let resendClient = null;

/**
 * Returns a cached Resend client instance or creates a new one if key is present.
 * @returns {Resend | null}
 */
export const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;

  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
};

/**
 * Allows resetting the client for testing or key rotation.
 */
export const resetResendClient = () => {
  resendClient = null;
};

/**
 * Sends a transactional email using the centralized sender registry and Resend.
 *
 * @param {object} options
 * @param {string} options.category - One of EMAIL_CATEGORIES (e.g. SECURITY, ONBOARDING, NOTIFICATIONS)
 * @param {string|string[]} options.to - Recipient email address(es)
 * @param {string} options.subject - Email subject line
 * @param {string} [options.html] - HTML body
 * @param {string} [options.text] - Plain text body
 * @param {string} [options.replyTo] - Optional reply-to email
 * @param {string|string[]} [options.cc] - Optional CC recipients
 * @param {string|string[]} [options.bcc] - Optional BCC recipients
 * @param {Array} [options.attachments] - Optional attachments
 * @returns {Promise<{ success: boolean, data?: object, messageId?: string, error?: object, devMode?: boolean }>}
 */
export const sendEmail = async ({
  category,
  to,
  subject,
  html,
  text,
  replyTo,
  cc,
  bcc,
  attachments,
}) => {
  // Validate recipient
  if (!to) {
    throw new Error("Recipient email ('to') is required.");
  }
  const recipientList = Array.isArray(to) ? to.map((r) => String(r).trim()) : [String(to).trim()];
  if (recipientList.length === 0 || recipientList.some((r) => !r)) {
    throw new Error("At least one valid recipient email is required.");
  }

  // Validate subject
  if (!subject || typeof subject !== "string" || !subject.trim()) {
    throw new Error("Email subject line is required.");
  }

  // Validate body content
  if (!html && !text) {
    throw new Error("Email body ('html' or 'text') is required.");
  }

  // Resolve sender from registry (validates category and env overrides)
  const from = getSender(category);

  // Check if Resend is configured
  const resend = getResendClient();
  if (!resend) {
    logger.info(
      `[DEV MODE] Email dispatch skipped (RESEND_API_KEY not configured) for ${recipientList.join(", ")} [category: ${category}]`
    );
    return {
      success: true,
      devMode: true,
      messageId: "dev-simulated-id",
      data: { id: "dev-simulated-id" },
    };
  }

  const payload = {
    from,
    to: recipientList,
    subject: subject.trim(),
    ...(html ? { html } : {}),
    ...(text ? { text } : {}),
    ...(replyTo ? { replyTo } : {}),
    ...(cc ? { cc: Array.isArray(cc) ? cc : [cc] } : {}),
    ...(bcc ? { bcc: Array.isArray(bcc) ? bcc : [bcc] } : {}),
    ...(attachments && attachments.length > 0 ? { attachments } : {}),
  };

  try {
    const { data, error } = await resend.emails.send(payload);

    if (error) {
      logger.error(
        `Resend email delivery rejected for ${recipientList.join(", ")} [${category}]: [${error.statusCode || error.name || "Error"}] ${error.message}`,
        {
          recipients: recipientList,
          category,
          statusCode: error.statusCode,
          errorName: error.name,
          errorMessage: error.message,
        }
      );
      return {
        success: false,
        error: {
          message: error.message,
          statusCode: error.statusCode,
          name: error.name,
        },
      };
    }

    logger.info(
      `Resend email accepted for ${recipientList.join(", ")} [${category}] (id: ${data?.id})`
    );

    return {
      success: true,
      data,
      messageId: data?.id,
    };
  } catch (err) {
    logger.error(
      `Resend email delivery exception for ${recipientList.join(", ")} [${category}]: ${err.message}`,
      {
        recipients: recipientList,
        category,
        error: err.message,
        stack: err.stack,
      }
    );
    return {
      success: false,
      error: {
        message: err.message,
      },
    };
  }
};
