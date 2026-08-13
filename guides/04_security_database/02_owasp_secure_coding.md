# OWASP Top 10 Enterprise Secure Coding & Zero-Trust Architecture

Application security is not an afterthought handled solely by perimeter firewalls—it must be baked into every layer of backend code and infrastructure. Senior and Lead Engineers are expected to recognize common attack vectors and implement preventative code patterns.

---

## 1. OWASP Top 10 Enterprise Breakdown & Mitigations

### 1. Broken Object Level Authorization (BOLA / IDOR) — #1 API Vulnerability
- **Attack**: An authenticated user changes the ID in the URL (`/api/v1/invoices/1004` $\to$ `/api/v1/invoices/1005`) to access another customer's private data.
- **Root Cause**: The API checks if the user is logged in, but fails to check if the user *owns* the specific entity requested.
- **Secure Code Pattern**:
  ```csharp
  // ❌ VULNERABLE: Only queries by entity Id
  var invoice = await _db.Invoices.FirstOrDefaultAsync(i => i.Id == invoiceId);

  // ✅ SECURE: Always scopes queries to the Authenticated User's Tenant/UserId
  var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
  var invoice = await _db.Invoices
      .FirstOrDefaultAsync(i => i.Id == invoiceId && i.UserId == currentUserId);
  ```

---

### 2. SQL & Command Injection
- **Attack**: Passing malicious SQL syntax in input fields (e.g. `' OR '1'='1`).
- **Mitigation**: Never use raw string concatenation in SQL queries. Always use parameterized queries or ORMs (EF Core / Dapper parameters).
  ```csharp
  // ❌ VULNERABLE
  var query = $"SELECT * FROM Users WHERE Email = '{email}'";

  // ✅ SECURE (EF Core / Dapper Parameterization)
  var user = await _db.Users.FromSqlInterpolated($"SELECT * FROM Users WHERE Email = {email}").FirstOrDefaultAsync();
  ```

---

### 3. Server-Side Request Forgery (SSRF)
- **Attack**: Attacker instructs a server webhook or image fetcher to call internal private network IPs or cloud metadata endpoints (`http://169.254.169.254/latest/meta-data/` in AWS) to exfiltrate IAM role credentials.
- **Mitigation**:
  1. Validate and whitelist allowed domain schemes (HTTPS only).
  2. Resolve DNS and explicitly reject private/loopback IP ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.1`, `169.254.169.254`).
  3. Enable **IMDSv2** (Instance Metadata Service v2) on AWS EC2/ECS which requires session token headers, blocking blind SSRF.

---

### 4. Cross-Site Scripting (XSS) & Cross-Site Request Forgery (CSRF)
- **XSS**: Injecting malicious JavaScript via untrusted user inputs.
  - *Defense*: Output encoding, DOM sanitization (DOMPurify), and enforcing strict **Content Security Policy (CSP)** HTTP headers (`Content-Security-Policy: default-src 'self'`).
- **CSRF**: Tricking an authenticated browser into submitting unauthorized commands to an API.
  - *Defense*: Set `SameSite=Strict` or `SameSite=Lax` on all authentication cookies and require custom request headers (e.g. `X-CSRF-TOKEN` or `X-Requested-With`).

---

## 2. Zero-Trust Architecture Principles

```text
┌────────────────────────────────────────────────────────┐
│ ZERO-TRUST CORE TENETS ("Never Trust, Always Verify")   │
│                                                        │
│ 1. Verify Explicitly:                                  │
│    Authenticate and authorize based on all available   │
│    data points (Identity, device health, location).    │
│                                                        │
│ 2. Use Least Privilege Access:                         │
│    Limit user and service access with Just-In-Time     │
│    (JIT) and Just-Enough-Access (JEA) IAM policies.   │
│                                                        │
│ 3. Assume Breach:                                      │
│    Segment networks, encrypt all data in-transit and   │
│    at-rest, and enforce Mutual TLS (mTLS) internally.  │
└────────────────────────────────────────────────────────┘
```

---

## 3. Senior & Lead Interview Scenarios

### Q1: How do you safeguard an enterprise API against Distributed Denial of Service (DDoS) and credential stuffing attacks?
**Lead Answer**: Use a defense-in-depth model across multiple architectural tiers:
1. **Perimeter / Edge Tier**: Deploy Cloudflare / AWS CloudFront with AWS WAF and AWS Shield to absorb volumetric DDoS and inspect bot traffic fingerprints.
2. **API Gateway Tier**: Enforce IP-based and token-based sliding-window rate limiting (`429 Too Many Requests`).
3. **Application Tier**: Implement CAPTCHA (reCAPTCHA v3 / Cloudflare Turnstile) on authentication endpoints and use exponential backoff account lockouts with password breach detection.

### Q2: What is the difference between Role-Based Access Control (RBAC) and Attribute-Based Access Control (ABAC)?
**Lead Answer**:
- **RBAC**: Grants permissions based on static roles assigned to a user (e.g., `User.IsInRole("Manager")`). Simple, but leads to "role explosion" when fine-grained rules are required.
- **ABAC**: Evaluates dynamic policies based on attributes of the user, the resource, and the environment (e.g., `User.Department == Resource.Department && Time.Now.IsBusinessHours() && User.ClearanceLevel >= Resource.Classification`). Provides maximum flexibility for enterprise governance.
