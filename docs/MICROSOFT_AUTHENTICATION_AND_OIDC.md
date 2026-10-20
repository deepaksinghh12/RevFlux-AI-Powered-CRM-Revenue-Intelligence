# RevFlux — Microsoft Entra ID (OIDC) Authentication Architecture

This document describes the OpenID Connect (OIDC) authentication implementation for Microsoft Entra ID in RevFlux.

---

## 1. Overview

RevFlux integrates Microsoft Entra ID (formerly Azure Active Directory) authentication using the OpenID Connect (OIDC) Authorization Code Flow with Proof Key for Code Exchange (PKCE), cryptographic state/nonce protection, and a short-lived single-use authorization code exchange (`ms_code`).

The implementation preserves all existing native authentication capabilities:
- Native RevFlux JWT sessions (`id`, `tv`)
- Email & password authentication
- Email OTP passwordless authentication
- Google sign-in
- Multi-tenant workspace isolation and RBAC role models
- Instant session revocation via `tokenVersion`

---

## 2. Microsoft Entra Application Registration

To configure RevFlux with Microsoft Entra ID:

1. Navigate to the **Microsoft Entra admin center** (`https://entra.microsoft.com`).
2. Go to **Identity > Applications > App registrations** and click **New registration**.
3. Configure the application:
   - **Name**: `RevFlux`
   - **Supported account types**:
     - **For both personal Microsoft accounts (MSA) and organizational work/school accounts (Recommended default)**: Select *Accounts in any organizational directory (Any Microsoft Entra ID tenant - Multitenant) and personal Microsoft accounts (e.g. Skype, Xbox)*.
     - **For organization/work accounts only**: Select *Accounts in any organizational directory (Any Microsoft Entra ID tenant - Multitenant)*.
     - **For single-tenant internal deployment**: Select *Accounts in this organizational directory only*.
   - **Redirect URI**:
     - Platform: **Web**
     - URI (Local): `http://localhost:8080/api/auth/microsoft/callback`
     - URI (Production): `https://api.yourdomain.com/api/auth/microsoft/callback`
4. Under **Certificates & secrets**:
   - Create a new **Client secret**.
   - Copy the secret value immediately (it is only shown once).
5. Under **API permissions**:
   - Ensure the following delegated Microsoft Graph permissions are granted:
     - `openid` (Sign users in)
     - `profile` (View users' basic profile)
     - `email` (View users' email address)
6. Under **Token configuration** (Optional but recommended):
   - Add optional claims: `email`, `preferred_username`, `upn`.

---

## 3. Environment Variables Configuration

| Variable | Required | Default | Description |
|---|---|---|---|
| `MICROSOFT_CLIENT_ID` | Yes | - | Application (client) ID from Entra registration. |
| `MICROSOFT_CLIENT_SECRET` | Yes | - | Client secret value from Entra registration. |
| `MICROSOFT_TENANT_ID` | No | `common` | `common` (default), `organizations`, or a specific tenant GUID. |
| `MICROSOFT_REDIRECT_URI` | No | `http://localhost:8080/api/auth/microsoft/callback` | Callback URL matching Entra registration. |
| `MICROSOFT_TENANT_POLICY` | No | `common` | Tenant enforcement policy: `common`, `organizations`, or `single`. |
| `MICROSOFT_ALLOWED_TENANTS` | No | - | Optional comma-separated list of permitted tenant GUIDs. |

### Tenant Policies:
- **`common` (Default)**: Permits BOTH personal Microsoft consumer accounts (`9188040d-6c67-4c5b-b112-36a304b66dad`) and enterprise work/school organizational accounts across any tenant.
- **`organizations`**: Restricts authentication strictly to work/school organizational accounts across any tenant. Rejects personal Microsoft consumer accounts.
- **`single`**: Restricts authentication exclusively to the tenant GUID specified in `MICROSOFT_TENANT_ID`. Any token issued by a different tenant is rejected with HTTP 403.
- **`MICROSOFT_ALLOWED_TENANTS`**: Explicit whitelist of tenant GUIDs. If set, only users belonging to one of the whitelisted tenants are admitted.

---

## 4. Authentication Architecture & Security Controls

```
User (Browser)               RevFlux Backend                 Microsoft Entra ID
      |                              |                                |
      | 1. Click "Sign in"           |                                |
      |----------------------------->|                                |
      |                              | 2. Generate state, nonce, PKCE |
      |                              |    Set signed HMAC cookie      |
      | 3. 302 Redirect to Entra     |<-------------------------------|
      |<-----------------------------|                                |
      |                                                               |
      | 4. User signs in with corporate credentials                   |
      |-------------------------------------------------------------->|
      |                                                               |
      | 5. 302 Callback with code & state                             |
      |----------------------------->|                                |
      |                              | 6. Validate state & nonce      |
      |                              | 7. Exchange code + PKCE verifier
      |                              |------------------------------->|
      |                              | 8. Returns id_token & access   |
      |                              |<-------------------------------|
      |                              | 9. Validate JWKS signature     |
      |                              |    Validate aud, iss, exp, tid |
      |                              | 10. Provision/resolve user     |
      |                              | 11. Create single-use ms_code  |
      | 12. 302 Redirect to /login?ms_code=...                        |
      |<-----------------------------|                                |
      |                              |                                |
      | 13. POST /api/auth/microsoft/exchange { code: ms_code }       |
      |----------------------------->|                                |
      |                              | 14. Atomically consume code    |
      |                              |     Issue RevFlux Bearer JWT   |
      | 15. Returns JSON { token, user }                              |
      |<-----------------------------|                                |
```

### Key Security Controls:
1. **Zero JWT URL Leakage (`ms_code` Exchange)**:
   - The native RevFlux bearer JWT is **never placed in a URL query parameter or browser redirect**.
   - Instead, the backend generates a cryptographically random, single-use exchange code (`ms_code`) with a 60-second lifetime stored in MongoDB (`MicrosoftAuthCode`).
   - The frontend immediately exchanges `ms_code` via `POST /api/auth/microsoft/exchange`.
   - The exchange code is consumed atomically using `findOneAndUpdate({ codeHash, consumed: false, expiresAt: { $gt: now } }, { $set: { consumed: true } })`, guaranteeing single-use across multiple backend instances without needing Redis.
2. **CSRF State Verification**:
   - `state` is a cryptographically random 32-byte hex string.
   - Stored in a signed HMAC-SHA256 HTTP-only cookie (`ms_auth_session`).
   - Callback validates `req.query.state === session.state`.
3. **Replay Protection (Nonce)**:
   - A unique 32-byte hex nonce is embedded in the authorization request.
   - Validated against the `nonce` claim in the decrypted `id_token`.
4. **PKCE (Proof Key for Code Exchange)**:
   - `code_challenge` generated via SHA-256 (`S256`).
   - 48-byte `code_verifier` (64 characters base64url) passed during token exchange, preventing authorization code interception.
5. **Token Verification**:
   - Fetches and caches Microsoft's JSON Web Key Set (JWKS) from Microsoft discovery endpoints.
   - Keys converted to PEM using native Node.js `crypto.createPublicKey({ key: jwk, format: "jwk" })`.
   - Verified with RS256 algorithm, strict audience match (`MICROSOFT_CLIENT_ID`), and strict issuer match (`https://login.microsoftonline.com/{tid}/v2.0`).
6. **Open Redirect Prevention**:
   - Return destinations are validated against `CLIENT_URL`.
   - Protocol-relative (`//`) and backslash (`\`) escapes are rejected.
7. **Error Sanitization**:
   - Raw identity provider errors, authorization codes, and internal stacks are never passed to the frontend URL or user logs.

---

## 5. Safe Account Linking Policy

To prevent account takeover and identity confusion:

1. **Deterministic Composite Key & Partial Unique Index**:
   - The Microsoft identity is stored as `microsoftId: "${tid}:${oid}"`.
   - Indexed as a **partial unique index** (`partialFilterExpression: { microsoftId: { $type: "string" } }`).
   - This ensures that users with `null` or missing `microsoftId` never collide with each other, while existing Microsoft identities remain strictly unique.

2. **No Silent Account Merging**:
   - If a user signs in with Microsoft and no account has that `microsoftId`, but an account already exists with that `email`:
     - RevFlux **never automatically links** the accounts.
     - A signed, tamper-proof, 10-minute linking ticket is generated.
     - The user is redirected to `/login?link_required=true&email=...&ticket=...`.

3. **Dual-Method Verification (Password OR Email OTP)**:
   - **Password-enabled users**: Enter their existing RevFlux password.
   - **Passwordless users (Google OAuth or Email OTP users)**: Can request a 6-digit verification code via `POST /api/auth/microsoft/link/request-otp`. The code is delivered to the verified email address using the centralized security email service.
   - The target account is strictly derived from the verified server-side ticket, never from browser input.
   - Upon verification of either the password or OTP, the `microsoftId` is linked and a RevFlux JWT is issued.

4. **New User Provisioning**:
   - If neither `microsoftId` nor `email` exists in RevFlux:
     - A new user account is created with a cryptographically secure random password.
     - The default workspace `${name}'s Workspace` is provisioned.
     - An active membership with `owner` role is assigned.
     - A single-use `ms_code` is returned for immediate token exchange.

---

## 6. Migration Considerations for Existing Databases

If deploying to an existing environment that previously created a `sparse` unique index on `microsoftId_1`:
- MongoDB does not automatically convert a `sparse` index to a `partialFilterExpression` index on schema change.
- To safely update the index in a running database without downtime:
  ```javascript
  // 1. Drop existing sparse index
  db.users.dropIndex("microsoftId_1");
  // 2. Create partial unique index
  db.users.createIndex(
    { microsoftId: 1 },
    { unique: true, partialFilterExpression: { microsoftId: { $type: "string" } } }
  );
  ```
- No database migrations should be run automatically during routine deployments.
