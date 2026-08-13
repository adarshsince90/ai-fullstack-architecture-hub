# Domain 3: Cloud Platforms & DevOps

Welcome to the **Cloud Platforms & DevOps** domain guide. This module covers production architectures across AWS and Azure, containerization with Docker and Kubernetes, Infrastructure as Code (IaC) with Terraform and CloudFormation, and robust CI/CD security pipelines.

---

## 🗺️ Domain Mind Map & Subtopics

```text
Cloud Platforms & DevOps
 ├── 1. AWS Cloud-Native Services (Lambda, ECS, EKS, S3, DynamoDB, EventBridge)
 ├── 2. Azure Enterprise Services (App Services, Functions, Key Vault, Cosmos DB, Azure AD)
 ├── 3. Containerization & Orchestration (Docker Multi-stage Builds, Kubernetes, Helm)
 └── 4. Infrastructure as Code & CI/CD Security (Terraform, GitHub Actions, SonarQube)
```

---

## 📚 Detailed Guides

1. [01_aws_cloud_native.md](./guides/03_cloud_devops/01_aws_cloud_native.md)
   - AWS Serverless (Lambda cold starts, provisioned concurrency) and container hosting (ECS Fargate vs EKS).
   - Event-driven patterns using Amazon EventBridge, SNS, SQS, and S3 event triggers.

2. [02_azure_enterprise.md](./guides/03_cloud_devops/02_azure_enterprise.md)
   - Azure App Services scaling, Deployment Slots, Azure Functions, Azure Key Vault managed identities.
   - Azure Cosmos DB multi-region replication and consistency levels.

3. [03_docker_kubernetes.md](./guides/03_cloud_devops/03_docker_kubernetes.md)
   - Dockerfile optimization: Multi-stage builds, non-root user security, distroless images.
   - Kubernetes primitives: Pods, Deployments, ReplicaSets, Services (ClusterIP/NodePort/LoadBalancer), Ingress, ConfigMaps, Secrets, and HPA (Horizontal Pod Autoscaler).

4. [04_terraform_cicd_pipelines.md](./guides/03_cloud_devops/04_terraform_cicd_pipelines.md)
   - Terraform state management, remote backends (S3/DynamoDB lock), modules, and drift detection.
   - CI/CD security quality gates: Static Application Security Testing (SAST), SonarQube, Dependabot, Container vulnerability scanning (Trivy).
