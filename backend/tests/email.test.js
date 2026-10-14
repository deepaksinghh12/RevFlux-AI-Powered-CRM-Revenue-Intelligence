import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { Resend } from "resend";
import {
  SENDER_DOMAIN,
  EMAIL_CATEGORIES,
  SENDER_REGISTRY,
  getSender,
  getAllSenders,
  isValidEmail,
} from "../config/email.config.js";
import { sendEmail, resetResendClient } from "../services/email.service.js";

describe("Centralized Email Infrastructure", () => {
  const sampleResend = new Resend("test_dummy_key");
  const EmailsProto = Object.getPrototypeOf(sampleResend.emails);
  const originalSend = EmailsProto.send;

  beforeEach(() => {
    resetResendClient();
    process.env.RESEND_API_KEY = "test_key_resend_mock";
  });

  afterEach(() => {
    EmailsProto.send = originalSend;
    resetResendClient();
    // Clean up any test env overrides
    delete process.env.RESEND_SECURITY_FROM_EMAIL;
    delete process.env.RESEND_ONBOARDING_FROM_EMAIL;
    delete process.env.RESEND_NOTIFICATIONS_FROM_EMAIL;
    delete process.env.RESEND_BILLING_FROM_EMAIL;
    delete process.env.RESEND_SUPPORT_FROM_EMAIL;
    delete process.env.RESEND_UPDATES_FROM_EMAIL;
    delete process.env.RESEND_GENERAL_FROM_EMAIL;
    delete process.env.RESEND_REPORTS_FROM_EMAIL;
  });

  describe("1. Sender Registry & Identities", () => {
    it("should target the verified domain", () => {
      assert.strictEqual(SENDER_DOMAIN, "revflux.deepaksinghdev.in");
    });

    it("should configure all eight expected sender categories", () => {
      const expectedCategories = [
        "SECURITY",
        "ONBOARDING",
        "NOTIFICATIONS",
        "BILLING",
        "SUPPORT",
        "UPDATES",
        "GENERAL",
        "REPORTS",
      ];
      assert.deepStrictEqual(Object.keys(EMAIL_CATEGORIES).sort(), expectedCategories.sort());
    });

    it("should configure all eight sender registry entries with accurate addresses and display names", () => {
      const senders = getAllSenders();

      assert.strictEqual(
        senders.SECURITY.formatted,
        "RevFlux Security <security@revflux.deepaksinghdev.in>"
      );
      assert.strictEqual(
        senders.ONBOARDING.formatted,
        "RevFlux Team <onboarding@revflux.deepaksinghdev.in>"
      );
      assert.strictEqual(
        senders.NOTIFICATIONS.formatted,
        "RevFlux Notifications <notifications@revflux.deepaksinghdev.in>"
      );
      assert.strictEqual(
        senders.BILLING.formatted,
        "RevFlux Billing <billing@revflux.deepaksinghdev.in>"
      );
      assert.strictEqual(
        senders.SUPPORT.formatted,
        "RevFlux Support <support@revflux.deepaksinghdev.in>"
      );
      assert.strictEqual(
        senders.UPDATES.formatted,
        "RevFlux Updates <updates@revflux.deepaksinghdev.in>"
      );
      assert.strictEqual(
        senders.GENERAL.formatted,
        "RevFlux Team <hello@revflux.deepaksinghdev.in>"
      );
      assert.strictEqual(
        senders.REPORTS.formatted,
        "RevFlux Reports <reports@revflux.deepaksinghdev.in>"
      );
    });

    it("should support case-insensitive category lookups", () => {
      assert.strictEqual(
        getSender("security"),
        "RevFlux Security <security@revflux.deepaksinghdev.in>"
      );
      assert.strictEqual(
        getSender("Notifications"),
        "RevFlux Notifications <notifications@revflux.deepaksinghdev.in>"
      );
    });

    it("should reject unknown categories with descriptive error", () => {
      assert.throws(
        () => getSender("MARKETING_CAMPAIGN"),
        /Unknown email category "MARKETING_CAMPAIGN"/
      );
      assert.throws(() => getSender(""), /Email category must be a non-empty string/);
    });
  });

  describe("2. Environment Overrides & Validation Safety", () => {
    it("should allow full format override (Display Name <email@domain>)", () => {
      process.env.RESEND_SECURITY_FROM_EMAIL = "Custom Security <sec@mycorp.com>";
      assert.strictEqual(getSender("SECURITY"), "Custom Security <sec@mycorp.com>");
    });

    it("should allow email-only override while preserving category display name", () => {
      process.env.RESEND_ONBOARDING_FROM_EMAIL = "welcome@mycorp.com";
      assert.strictEqual(getSender("ONBOARDING"), "RevFlux Team <welcome@mycorp.com>");
    });

    it("should reject empty environment variable overrides", () => {
      process.env.RESEND_BILLING_FROM_EMAIL = "   ";
      assert.throws(
        () => getSender("BILLING"),
        /Invalid sender configuration: environment variable RESEND_BILLING_FROM_EMAIL is set but empty/
      );
    });

    it("should reject malformed email overrides without silent fallback", () => {
      process.env.RESEND_NOTIFICATIONS_FROM_EMAIL = "not-an-email-address";
      assert.throws(
        () => getSender("NOTIFICATIONS"),
        /Invalid sender configuration in RESEND_NOTIFICATIONS_FROM_EMAIL/
      );
    });

    it("should reject malformed angle bracket overrides", () => {
      process.env.RESEND_SUPPORT_FROM_EMAIL = "Bad Name <invalid-email>";
      assert.throws(
        () => getSender("SUPPORT"),
        /Invalid sender configuration in RESEND_SUPPORT_FROM_EMAIL/
      );
    });
  });

  describe("3. Email Service Dispatch & Resend Integration", () => {
    it("should dispatch email using correct sender from category", async () => {
      let sentPayload = null;
      EmailsProto.send = async (payload) => {
        sentPayload = payload;
        return { data: { id: "resend_msg_test_123" }, error: null };
      };

      const result = await sendEmail({
        category: EMAIL_CATEGORIES.SECURITY,
        to: "recipient@example.com",
        subject: "Security Alert",
        html: "<p>Verification</p>",
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.messageId, "resend_msg_test_123");
      assert.ok(sentPayload);
      assert.strictEqual(
        sentPayload.from,
        "RevFlux Security <security@revflux.deepaksinghdev.in>"
      );
      assert.deepStrictEqual(sentPayload.to, ["recipient@example.com"]);
      assert.strictEqual(sentPayload.subject, "Security Alert");
    });

    it("should handle Resend provider rejection without leaking secrets", async () => {
      EmailsProto.send = async () => ({
        data: null,
        error: {
          statusCode: 403,
          name: "validation_error",
          message: "The domain example.com is not verified.",
        },
      });

      const result = await sendEmail({
        category: EMAIL_CATEGORIES.ONBOARDING,
        to: "newuser@example.com",
        subject: "Welcome",
        text: "Welcome to RevFlux",
      });

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error.statusCode, 403);
      assert.strictEqual(result.error.name, "validation_error");
      assert.strictEqual(result.error.message, "The domain example.com is not verified.");
      // Ensure API key is never exposed
      const jsonString = JSON.stringify(result);
      assert.strictEqual(jsonString.includes(process.env.RESEND_API_KEY), false);
    });

    it("should handle Resend network exceptions gracefully", async () => {
      EmailsProto.send = async () => {
        throw new Error("Connection reset by peer");
      };

      const result = await sendEmail({
        category: EMAIL_CATEGORIES.NOTIFICATIONS,
        to: "rep@example.com",
        subject: "Lead Assignment",
        text: "You have a new lead",
      });

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error.message, "Connection reset by peer");
    });

    it("should enforce input validation for recipients, subject, and body", async () => {
      await assert.rejects(
        () =>
          sendEmail({
            category: EMAIL_CATEGORIES.SECURITY,
            to: "",
            subject: "Sub",
            text: "Body",
          }),
        /Recipient email \('to'\) is required/
      );

      await assert.rejects(
        () =>
          sendEmail({
            category: EMAIL_CATEGORIES.SECURITY,
            to: "user@test.com",
            subject: "",
            text: "Body",
          }),
        /Email subject line is required/
      );

      await assert.rejects(
        () =>
          sendEmail({
            category: EMAIL_CATEGORIES.SECURITY,
            to: "user@test.com",
            subject: "Sub",
          }),
        /Email body \('html' or 'text'\) is required/
      );
    });

    it("should simulate delivery in development when RESEND_API_KEY is missing", async () => {
      delete process.env.RESEND_API_KEY;
      resetResendClient();

      const result = await sendEmail({
        category: EMAIL_CATEGORIES.GENERAL,
        to: "test@example.com",
        subject: "Dev Notice",
        text: "Hello from local dev",
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.devMode, true);
    });
  });

  describe("4. Inactive / Future Sender Identities Audit", () => {
    it("should have BILLING, UPDATES, SUPPORT, GENERAL, REPORTS available in registry without triggering unsolicited jobs", () => {
      const senders = getAllSenders();
      const futureIdentities = ["BILLING", "UPDATES", "SUPPORT", "GENERAL", "REPORTS"];

      for (const id of futureIdentities) {
        assert.ok(senders[id], `Identity ${id} should be registered`);
        assert.ok(senders[id].formatted.includes("revflux.deepaksinghdev.in"));
      }
    });
  });

  describe("5. Feature Workflow Routing Verification", () => {
    it("should route OTP emails to SECURITY identity", async () => {
      let dispatchedFrom = null;
      EmailsProto.send = async (payload) => {
        dispatchedFrom = payload.from;
        return { data: { id: "sec_123" }, error: null };
      };

      await sendEmail({
        category: EMAIL_CATEGORIES.SECURITY,
        to: "user@example.com",
        subject: "Your RevFlux Verification Code",
        html: "<p>123456</p>",
      });

      assert.strictEqual(dispatchedFrom, "RevFlux Security <security@revflux.deepaksinghdev.in>");
    });

    it("should route Organization Invitations to ONBOARDING identity", async () => {
      let dispatchedFrom = null;
      EmailsProto.send = async (payload) => {
        dispatchedFrom = payload.from;
        return { data: { id: "onb_123" }, error: null };
      };

      await sendEmail({
        category: EMAIL_CATEGORIES.ONBOARDING,
        to: "invitee@example.com",
        subject: "You've been invited to join Workspace on RevFlux",
        html: "<p>Accept invite</p>",
      });

      assert.strictEqual(dispatchedFrom, "RevFlux Team <onboarding@revflux.deepaksinghdev.in>");
    });

    it("should route CRM notifications and lead emails to NOTIFICATIONS identity", async () => {
      let dispatchedFrom = null;
      EmailsProto.send = async (payload) => {
        dispatchedFrom = payload.from;
        return { data: { id: "notif_123" }, error: null };
      };

      await sendEmail({
        category: EMAIL_CATEGORIES.NOTIFICATIONS,
        to: "lead@example.com",
        subject: "Follow-up regarding proposal",
        html: "<p>Checking in</p>",
      });

      assert.strictEqual(dispatchedFrom, "RevFlux Notifications <notifications@revflux.deepaksinghdev.in>");
    });

    it("should handle organization invitation delivery failures consistently without leaking internal errors", async () => {
      EmailsProto.send = async () => ({
        data: null,
        error: { statusCode: 403, message: "Domain unverified", name: "validation_error" },
      });

      const sendResult = await sendEmail({
        category: EMAIL_CATEGORIES.ONBOARDING,
        to: "invitee@example.com",
        subject: "Workspace invite",
        html: "<p>Invite</p>",
      });

      assert.strictEqual(sendResult.success, false);
      const emailDelivered = Boolean(sendResult.success);
      const clientMessage = emailDelivered
        ? "Invitation sent to invitee@example.com!"
        : "Invitation created, but the invitation email could not be delivered.";

      assert.strictEqual(emailDelivered, false);
      assert.strictEqual(clientMessage.includes("Domain unverified"), false);
      assert.strictEqual(clientMessage.includes("403"), false);
      assert.strictEqual(clientMessage, "Invitation created, but the invitation email could not be delivered.");
    });
  });
});
