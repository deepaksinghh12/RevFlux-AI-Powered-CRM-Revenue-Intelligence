import crypto from "crypto";
import jwt from "jsonwebtoken";
import logger from "../config/logger.js";
import { ApiError } from "../utils/apiError.js";
import MicrosoftAuthCode from "../models/MicrosoftAuthCode.js";

// Known Microsoft personal tenant GUID to reject under enterprise/organization policy
export const MS_PERSONAL_TENANT_ID = "9188040d-6c67-4c5b-b112-36a304b66dad";

// In-memory JWKS cache: { keys: Array, expiresAt: number }
let jwksCache = {
  keys: null,
  expiresAt: 0,
};

/**
 * Returns current Microsoft OIDC configuration from environment
 */
export const getMicrosoftConfig = () => {
  const clientId = process.env.MICROSOFT_CLIENT_ID || "";
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET || "";
  const tenantId = process.env.MICROSOFT_TENANT_ID || "common";
  const redirectUri = process.env.MICROSOFT_REDIRECT_URI || "http://localhost:8080/api/auth/microsoft/callback";
  let defaultPolicy = "common";
  if (tenantId === "organizations") {
    defaultPolicy = "organizations";
  } else if (tenantId !== "common") {
    defaultPolicy = "single";
  }
  const tenantPolicy = process.env.MICROSOFT_TENANT_POLICY || defaultPolicy;
  const allowedTenants = (process.env.MICROSOFT_ALLOWED_TENANTS || "")
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  const isConfigured = Boolean(clientId && clientSecret);

  return {
    clientId,
    clientSecret,
    tenantId,
    redirectUri,
    tenantPolicy,
    allowedTenants,
    isConfigured,
  };
};

/**
 * Resets cached JWKS keys (useful for testing or key rotation)
 */
export const resetJwksCache = () => {
  jwksCache = { keys: null, expiresAt: 0 };
};

/**
 * Validates tenant ID against defined tenant policy
 */
export const validateTenantPolicy = (tid, config = getMicrosoftConfig()) => {
  if (!tid || typeof tid !== "string") {
    throw new ApiError(403, "Invalid or missing tenant identifier (tid) in Microsoft token");
  }

  const normalizedTid = tid.toLowerCase().trim();

  // If specific allowed tenants are configured, strictly whitelist them
  if (config.allowedTenants.length > 0) {
    if (!config.allowedTenants.includes(normalizedTid)) {
      throw new ApiError(403, "Authentication denied: Microsoft tenant is not authorized for this workspace");
    }
    return true;
  }

  // Single-tenant policy: tid must match configured tenant ID
  if (config.tenantPolicy === "single") {
    const expected = config.tenantId.toLowerCase().trim();
    if (normalizedTid !== expected) {
      throw new ApiError(403, `Authentication denied: token tenant does not match required tenant (${config.tenantId})`);
    }
    return true;
  }

  // Organizations policy: allow any enterprise/work/school tenant, but reject personal accounts
  if (config.tenantPolicy === "organizations") {
    if (normalizedTid === MS_PERSONAL_TENANT_ID) {
      throw new ApiError(403, "Authentication denied: Personal Microsoft accounts are not permitted. Please use your work or school account.");
    }
    return true;
  }

  // Common policy: allows any tenant
  if (config.tenantPolicy === "common") {
    return true;
  }

  throw new ApiError(403, `Unsupported Microsoft tenant policy: ${config.tenantPolicy}`);
};

/**
 * Generates cryptographic state, nonce, and PKCE parameters
 * Uses 48 bytes base64url for codeVerifier (64 characters, RFC 7636 compliant)
 */
export const generateOidcParams = () => {
  const state = crypto.randomBytes(32).toString("hex");
  const nonce = crypto.randomBytes(32).toString("hex");
  const codeVerifier = crypto.randomBytes(48).toString("base64url");
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");

  return {
    state,
    nonce,
    codeVerifier,
    codeChallenge,
  };
};

/**
 * Sanitizes returnTo redirect destination to prevent open redirects
 */
export const sanitizeReturnTo = (url, clientUrl = process.env.CLIENT_URL || "http://localhost:5173") => {
  if (!url || typeof url !== "string") return clientUrl;
  const trimmed = url.trim();

  // Allow relative paths starting with single '/'
  if (trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.includes("\\")) {
    return `${clientUrl.replace(/\/+$/, "")}${trimmed}`;
  }

  // Allow absolute URLs that strictly match clientUrl origin
  try {
    const parsedTarget = new URL(trimmed);
    const parsedClient = new URL(clientUrl);
    if (parsedTarget.origin === parsedClient.origin) {
      return trimmed;
    }
  } catch {
    // Malformed URL
  }

  return clientUrl;
};

/**
 * Signs state payload with HMAC-SHA256 for tamper-proof cookie storage
 */
export const signStateCookie = (payload, secret = process.env.JWT_SECRET) => {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${signature}`;
};

/**
 * Verifies signed state cookie and returns payload
 */
export const verifyStateCookie = (cookieValue, secret = process.env.JWT_SECRET) => {
  if (!cookieValue || typeof cookieValue !== "string" || !cookieValue.includes(".")) {
    throw new ApiError(400, "Missing or invalid OAuth state session");
  }

  const [data, signature] = cookieValue.split(".");
  const expectedSignature = crypto.createHmac("sha256", secret).update(data).digest("base64url");

  const sigBuffer = Buffer.from(signature);
  const expBuffer = Buffer.from(expectedSignature);

  if (sigBuffer.length !== expBuffer.length || !crypto.timingSafeEqual(sigBuffer, expBuffer)) {
    throw new ApiError(400, "OAuth state integrity check failed");
  }

  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
    const maxAgeMs = 15 * 60 * 1000; // 15 minutes TTL
    if (!payload.createdAt || Date.now() - payload.createdAt > maxAgeMs) {
      throw new ApiError(400, "OAuth session expired. Please sign in again.");
    }
    return payload;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(400, "Corrupted OAuth state session");
  }
};

/**
 * Signs an explicit account-linking ticket with 10-minute validity
 */
export const createLinkingTicket = (payload, secret = process.env.JWT_SECRET) => {
  return jwt.sign(
    {
      action: "link_microsoft",
      ...payload,
    },
    secret,
    { expiresIn: "10m" }
  );
};

/**
 * Verifies an explicit account-linking ticket
 */
export const verifyLinkingTicket = (ticket, secret = process.env.JWT_SECRET) => {
  if (!ticket || typeof ticket !== "string") {
    throw new ApiError(400, "Account linking ticket is required");
  }

  try {
    const decoded = jwt.verify(ticket, secret);
    if (decoded.action !== "link_microsoft") {
      throw new ApiError(400, "Invalid linking ticket type");
    }
    return decoded;
  } catch (err) {
    throw new ApiError(400, "Account linking ticket is invalid or expired. Please sign in again.");
  }
};

/**
 * Builds the Microsoft Entra ID authorization URL
 */
export const buildAuthorizationUrl = ({
  state,
  nonce,
  codeChallenge,
  config = getMicrosoftConfig(),
}) => {
  if (!config.isConfigured) {
    throw new ApiError(503, "Microsoft authentication is not configured on this server");
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: "code",
    redirect_uri: config.redirectUri,
    response_mode: "query",
    scope: "openid profile email",
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  return `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
};

/**
 * Fetches and caches Microsoft Entra JWKS
 */
export const fetchJwks = async (tenantId = "common") => {
  const now = Date.now();
  if (jwksCache.keys && jwksCache.expiresAt > now) {
    return jwksCache.keys;
  }

  const jwksUri = `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`;
  const response = await fetch(jwksUri, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Microsoft JWKS: HTTP ${response.status}`);
  }

  const data = await response.json();
  if (!data || !Array.isArray(data.keys)) {
    throw new Error("Invalid JWKS payload from Microsoft");
  }

  // Cache for 6 hours
  jwksCache = {
    keys: data.keys,
    expiresAt: now + 6 * 60 * 60 * 1000,
  };

  return data.keys;
};

/**
 * Injects mock JWKS keys for testing environments
 */
export const injectMockJwks = (keys) => {
  jwksCache = {
    keys,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  };
};

/**
 * Exchanges authorization code for tokens at Microsoft token endpoint.
 * Sanitizes external error descriptions to prevent leaking diagnostics to the client.
 */
export const exchangeCodeForTokens = async ({
  code,
  codeVerifier,
  config = getMicrosoftConfig(),
}) => {
  const tokenUri = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`;

  const bodyParams = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: config.redirectUri,
    code_verifier: codeVerifier,
  });

  const response = await fetch(tokenUri, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: bodyParams.toString(),
    signal: AbortSignal.timeout(10000),
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    logger.error("Microsoft token exchange error from identity provider:", {
      error: data.error,
      description: data.error_description,
    });
    // Sanitize user-facing error to prevent leaking secrets/internal config to the browser
    throw new ApiError(401, "Microsoft token exchange was rejected by the identity provider.");
  }

  return data;
};

/**
 * Validates Microsoft Entra ID token and extracts verified claims
 */
export const validateIdToken = async ({
  idToken,
  expectedNonce,
  config = getMicrosoftConfig(),
}) => {
  if (!idToken || typeof idToken !== "string") {
    throw new ApiError(400, "Missing or invalid Microsoft ID token");
  }

  const decodedHeader = jwt.decode(idToken, { complete: true });
  if (!decodedHeader || !decodedHeader.header || !decodedHeader.header.kid) {
    throw new ApiError(400, "Malformed Microsoft ID token: missing 'kid' in header");
  }

  const kid = decodedHeader.header.kid;
  const keys = await fetchJwks(config.tenantId);
  const matchingKey = keys.find((k) => k.kid === kid);

  if (!matchingKey) {
    throw new ApiError(401, "No matching public key found in Microsoft JWKS for token");
  }

  // Convert JWK to PEM format via Node.js crypto
  let pemKey;
  try {
    const importedKey = crypto.createPublicKey({ key: matchingKey, format: "jwk" });
    pemKey = importedKey.export({ type: "spki", format: "pem" });
  } catch (err) {
    logger.error("Failed to parse Microsoft JWK to PEM:", err);
    throw new ApiError(500, "Internal error validating identity provider key");
  }

  // Verify signature, audience, and expiry
  let payload;
  try {
    payload = jwt.verify(idToken, pemKey, {
      algorithms: ["RS256"],
      audience: config.clientId,
    });
  } catch (err) {
    logger.warn("Microsoft ID token verification failed:", err.message);
    throw new ApiError(401, "Invalid Microsoft ID token signature or expired token");
  }

  // Validate issuer format: https://login.microsoftonline.com/{tid}/v2.0
  if (!payload.tid) {
    throw new ApiError(401, "Missing tenant ID (tid) in Microsoft ID token");
  }

  const expectedIssuer = `https://login.microsoftonline.com/${payload.tid}/v2.0`;
  if (payload.iss !== expectedIssuer) {
    throw new ApiError(401, `Invalid token issuer: expected ${expectedIssuer}, received ${payload.iss}`);
  }

  // Validate nonce protection against replay attacks
  if (expectedNonce && payload.nonce !== expectedNonce) {
    throw new ApiError(401, "Nonce mismatch in Microsoft ID token. Possible replay attack.");
  }

  // Validate tenant policy
  validateTenantPolicy(payload.tid, config);

  // Extract identity attributes
  const oid = payload.oid || payload.sub;
  if (!oid) {
    throw new ApiError(400, "Missing object ID (oid) in Microsoft ID token");
  }

  const tid = payload.tid;
  const microsoftId = `${tid}:${oid}`;
  const email = (payload.email || payload.preferred_username || payload.upn || "").toLowerCase().trim();
  const name = payload.name || (email ? email.split("@")[0] : "Microsoft User");

  return {
    oid,
    tid,
    microsoftId,
    email,
    name,
    rawPayload: payload,
  };
};

/**
 * Creates a short-lived single-use authorization code backed by MongoDB atomic lock
 */
export const createExchangeCode = async ({ userId, tokenVersion = 0 }) => {
  return await MicrosoftAuthCode.createCode({ userId, tokenVersion });
};

/**
 * Atomically consumes an authorization exchange code.
 * Ensures the code is strictly single-use and cannot be exchanged concurrently.
 */
export const consumeExchangeCode = async (rawCode) => {
  return await MicrosoftAuthCode.consumeCode(rawCode);
};
