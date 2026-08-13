# Domain 4: Security & Data Engineering

Welcome to the **Security & Data Engineering** domain guide. This module covers enterprise authentication & authorization, OWASP Top 10 vulnerabilities, relational database query tuning in SQL Server, and NoSQL single-table design with Amazon DynamoDB.

---

## 🗺️ Domain Mind Map & Subtopics

```text
Security & Data Engineering
 ├── 1. Authentication, OAuth 2.0, OpenID Connect & JWT Token Lifecycle
 ├── 2. OWASP Top 10 & Enterprise Secure Coding Practices
 ├── 3. SQL Server Tuning, Execution Plans & Indexing Architecture
 └── 4. DynamoDB NoSQL Data Modeling & Single-Table Design
```

---

## 📚 Detailed Guides

1. [01_oauth2_oidc_jwt.md](./guides/04_security_database/01_oauth2_oidc_jwt.md)
   - OAuth 2.0 Grant Types (Authorization Code with PKCE, Client Credentials, Refresh Tokens).
   - OpenID Connect (OIDC) ID Tokens vs Access Tokens.
   - JWT structure (Header, Payload, Signature), verification against JWKS (JSON Web Key Set), and revocation strategies.

2. [02_owasp_secure_coding.md](./guides/04_security_database/02_owasp_secure_coding.md)
   - OWASP Top 10 mitigations: SQL Injection, Broken Access Control (BOLA/IDOR), SSRF, XSS, CSRF.
   - Secrets management, token rotation, and zero-trust networking.

3. [03_sql_query_tuning.md](./guides/04_security_database/03_sql_query_tuning.md)
   - SQL Server Execution Plan analysis: Index Seek vs Index Scan, Clustered vs Non-Clustered Indexes, Key Lookups.
   - Covering Indexes (`INCLUDE` columns), Parameter Sniffing, and deadlock prevention.

4. [04_dynamodb_data_modeling.md](./guides/04_security_database/04_dynamodb_data_modeling.md)
   - Partition Keys (PK) and Sort Keys (SK) design.
   - Global Secondary Indexes (GSI) vs Local Secondary Indexes (LSI).
   - Single-Table Design patterns: 1-to-N relationships, Overloading keys, and Query vs Scan performance.
