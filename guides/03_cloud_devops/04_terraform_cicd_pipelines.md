# Terraform (IaC), CI/CD Security & Release Engineering

Infrastructure as Code (IaC) and automated CI/CD deployment pipelines form the backbone of modern platform engineering. Senior and Lead Engineers must know how to maintain declarative state consistency, enforce security quality gates, and configure keyless OIDC cloud authentication.

---

## 1. Terraform Architecture & State Management

Terraform manages cloud infrastructure declaratively using HashiCorp Configuration Language (HCL).

```text
┌────────────────────────────────────────────────────────┐
│ TERRAFORM EXECUTION ENGINE                             │
│                                                        │
│  [ main.tf / variables.tf ] ──► (Desired State)        │
│                │                                       │
│                ▼ (Constructs Directed Acyclic Graph)   │
│  [ terraform.tfstate ] ──────► (Current Real State)    │
│                │                                       │
│                ▼                                       │
│  [ terraform plan ] ─────────► (Calculates Diff / Plan)│
│                │                                       │
│                ▼                                       │
│  [ Cloud Provider APIs ] ────► (Provisions AWS/Azure)  │
└────────────────────────────────────────────────────────┘
```

### Production Remote State Backend with S3 & DynamoDB:
```hcl
terraform {
  backend "s3" {
    bucket         = "enterprise-terraform-state-prod"
    key            = "platform/networking/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-state-lock" # Enforces atomic write locks during deployments!
    encrypt        = true
  }
}
```

### State Drift & Remediation:
- **State Drift**: Occurs when engineers manually modify cloud resources via the AWS/Azure Web Console outside Terraform.
- **Drift Detection in CI/CD**: Run `terraform plan -detailed-exitcode` on a scheduled cron job. If changes are detected (exit code 2), fire a PagerDuty alert.
- **Remediation**: Re-apply Terraform configuration to overwrite manual changes or use `terraform import` to adopt legitimate untracked resources.

---

## 2. Enterprise CI/CD Pipeline Architecture & Quality Gates

```text
Developer Git Push (Feature Branch)
       │
       ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 1. CI BUILD & CODE QUALITY GATE                                        │
│    • Compile code (.NET / Node.js)                                     │
│    • Run Fast Unit Tests with Code Coverage (>80%)                     │
│    • Static Application Security Testing (SAST) via SonarQube          │
├────────────────────────────────────────────────────────────────────────┤
│ 2. CONTAINERIZATION & SECURITY SCANNING                                │
│    • Build Docker Multi-Stage Image                                    │
│    • Vulnerability Scan via Trivy / Snyk (Block build on CRITICAL CVEs)│
│    • Sign Container Image using Cosign / Notary                        │
├────────────────────────────────────────────────────────────────────────┤
│ 3. INFRASTRUCTURE & BLUE/GREEN DEPLOYMENT                              │
│    • Terraform Plan & Automated Review Gate                            │
│    • Deploy to Staging Environment ──► Run Integration / Smoke Tests   │
│    • Automated Blue/Green Canary Traffic Shift to Production           │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Keyless Cloud Authentication with OIDC (OpenID Connect)

Storing long-lived `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in GitHub Actions repository secrets is a severe security vulnerability. Modern enterprise pipelines use **OIDC Federation**:

```text
┌────────────────────────────────────────────────────────┐
│ OIDC FEDERATED AUTHENTICATION WORKFLOW                 │
│                                                        │
│ 1. GitHub Actions runner requests a short-lived OIDC   │
│    JSON Web Token from GitHub Token Service.           │
│                                                        │
│ 2. Runner presents JWT to AWS STS (Security Token Svc).│
│                                                        │
│ 3. AWS validates GitHub's cryptographic signature and  │
│    checks IAM Trust Policy condition:                  │
│    StringEquals: "repo:org/app:ref:refs/heads/main"    │
│                                                        │
│ 4. AWS STS assumes IAM Role & returns 15-minute        │
│    temporary credentials to the GitHub runner!         │
└────────────────────────────────────────────────────────┘
```

---

## 4. Senior & Lead Interview Scenarios

### Q1: How do you prevent sensitive secrets (passwords, private keys) from being stored in plain text in `terraform.tfstate`?
**Lead Answer**:
1. **Never store raw secrets in Terraform variables**: Reference secrets dynamically at runtime from **AWS Secrets Manager**, **Azure Key Vault**, or **HashiCorp Vault** using data blocks.
2. **Encrypt State at Rest and in Transit**: Store `terraform.tfstate` in an S3 bucket configured with AWS KMS Customer Managed Keys (CMK) and enforce HTTPS TLS transit policies.
3. **Restrict IAM Access**: Restrict S3 state bucket read permissions strictly to the automated CI/CD deployment execution role.

### Q2: What is the difference between Blue/Green Deployments and Canary Releases?
**Lead Answer**:
- **Blue/Green**: Two identical production environments exist simultaneously. 100% of traffic routes to Blue (Active). The new version is deployed to Green (Idle), verified, and then the load balancer switches 100% of traffic to Green instantaneously. Fast rollback, but requires 2x compute capacity.
- **Canary**: The new version is deployed alongside the old version. Traffic is gradually shifted (e.g. 5% $\to$ 25% $\to$ 50% $\to$ 100%) while automated monitoring tracks error rates (HTTP 5xx) and latency. If error rates spike, traffic reverts to 0% automatically.
