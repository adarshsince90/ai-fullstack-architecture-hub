# OAuth 2.0, OpenID Connect (OIDC) & JWT Token Lifecycle

Security architecture in distributed systems requires robust identity federation, delegated authorization, and tamper-proof cryptographic tokens. Senior and Lead Engineers must understand the mathematical and protocol mechanics behind OAuth 2.0, PKCE, and JWT verification.

---

## 1. OAuth 2.0 vs OpenID Connect (OIDC)

```text
┌────────────────────────────────────────────────────────┐
│ OPENID CONNECT (OIDC) = IDENTITY & AUTHENTICATION      │
│ "Who are you?" (Provides ID Token / User Profile)      │
├────────────────────────────────────────────────────────┤
│ OAUTH 2.0 = DELEGATED AUTHORIZATION                    │
│ "What are you allowed to do?" (Provides Access Token)  │
└────────────────────────────────────────────────────────┘
```

### The 4 OAuth 2.0 Roles:
1. **Resource Owner**: The end user who owns the data.
2. **Client**: The application requesting access (e.g. React SPA, Mobile App, Backend Service).
3. **Authorization Server**: The Identity Provider (Auth0, Okta, Microsoft Entra ID, Keycloak).
4. **Resource Server**: The API / Microservice hosting protected data.

---

## 2. Authorization Code Flow with PKCE (Proof Key for Code Exchange)

Single Page Applications (React/Angular) and mobile clients are **Public Clients**—they cannot securely store client secrets in source code. **PKCE** (RFC 7636) eliminates the need for client secrets:

```text
┌──────────────┐          ┌──────────────────────┐          ┌─────────────────┐
│ Browser/SPA  │          │ Authorization Server │          │  API Gateway /  │
│   (Client)   │          │ (Auth0 / Entra ID)   │          │ Resource Server │
└──────┬───────┘          └──────────┬───────────┘          └────────┬────────┘
       │                             │                               │
       │ 1. Generates:               │                               │
       │    code_verifier (random)   │                               │
       │    code_challenge =         │                               │
       │    BASE64URL(SHA256(verif)) │                               │
       │                             │                               │
       │ 2. GET /authorize with      │                               │
       │    code_challenge & S256    │                               │
       ├────────────────────────────►│                               │
       │                             │                               │
       │ 3. User authenticates;      │                               │
       │    returns authorization_code                               │
       │◄────────────────────────────┤                               │
       │                             │                               │
       │ 4. POST /oauth/token with   │                               │
       │    authorization_code +     │                               │
       │    code_verifier (plain)    │                               │
       ├────────────────────────────►│                               │
       │                             │ (Auth Server calculates       │
       │                             │  SHA256(verifier) and checks  │
       │                             │  if it matches challenge)     │
       │ 5. Returns Access & ID Token│                               │
       │◄────────────────────────────┤                               │
       │                                                             │
       │ 6. HTTP GET /api/orders (Authorization: Bearer <JWT>)       │
       ├────────────────────────────────────────────────────────────►│
       │                                                             │ (Validates RS256 signature
       │                                                             │  via cached JWKS public key)
```

### Why PKCE Prevents Code Interception:
If a malicious attacker intercepts the `authorization_code` from the browser redirect, they **cannot** exchange it for tokens because they do not possess the private, in-memory `code_verifier`.

---

## 3. JSON Web Token (JWT) Anatomy & Cryptographic Signing

```text
┌────────────────────────────────────────────────────────┐
│ Header:    {"alg": "RS256", "typ": "JWT", "kid": "k1"} │
│ Payload:   {"sub": "usr_99", "roles": ["Admin"], ...}  │
│ Signature: RSA_SHA256(Base64(Header) + "." +           │
│                       Base64(Payload), PrivateKey)     │
└────────────────────────────────────────────────────────┘
```

### Asymmetric (RS256) vs Symmetric (HS256) Signing:
- **HS256 (HMAC-SHA256)**: Uses a shared symmetric secret for both signing and verifying.
  - *Vulnerability in Microservices*: Every microservice verifying tokens must hold the secret key. If one service is compromised, the attacker can forge valid admin tokens for all services.
- **RS256 (RSA-SHA256)**: Uses an Asymmetric Key Pair.
  - The Authorization Server signs tokens with a **Private Key**.
  - All microservices verify signatures using the **Public Key** downloaded from the `/.well-known/jwks.json` endpoint.

---

## 4. Token Revocation & Refresh Token Rotation (RTR)

Because JWTs are stateless, they cannot be natively revoked before their `exp` expiration timestamp.

```text
Secure Refresh Token Lifecycle:
1. Client presents Refresh Token RT1 to get new Access Token.
2. Auth Server invalidates RT1 and issues RT2 + new Access Token.
3. If RT1 is presented AGAIN (Replay Attack):
   └── Auth Server detects token theft and immediately revokes RT2 and all active sessions for that user!
```

---

## 5. Senior & Lead Interview Scenarios

### Q1: Where should JWT access tokens be stored in a Single-Page Application (React/Angular)?
**Lead Answer**: 
- **Never in `localStorage` or `sessionStorage`**: Accessible to any JavaScript executing on the page, making tokens vulnerable to Cross-Site Scripting (XSS) data exfiltration.
- **Best Practice (BFF Pattern)**: Store tokens in `HttpOnly`, `Secure`, `SameSite=Strict` cookies managed by a Backend-for-Frontend (BFF) proxy.
- **Pure SPA Fallback**: Keep the Access Token in in-memory JavaScript state (destroyed upon tab close) and retrieve fresh tokens via silent refresh using an `HttpOnly` refresh cookie.

### Q2: How do Resource Servers validate JWT tokens without creating a network bottleneck to the Authorization Server?
**Lead Answer**: Microservices validate JWTs locally and offline:
1. At startup, the microservice fetches the public keys from the Auth Server's JWKS (JSON Web Key Set) endpoint (`/.well-known/jwks.json`) and caches them in memory.
2. For each incoming request, the service inspects the token's `kid` (Key ID) header, validates the RS256 signature using the cached public key, checks `nbf < now < exp`, and validates `iss` (Issuer) and `aud` (Audience).
3. Network calls to the Auth Server are zero during normal request execution.
