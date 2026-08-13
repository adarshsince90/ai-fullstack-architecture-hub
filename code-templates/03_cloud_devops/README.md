# Domain 3 Code Templates: Cloud Platforms & DevOps

Infrastructure as Code (IaC) and CI/CD automated pipeline templates for AWS, Azure, Docker, and Kubernetes.

---

## 📂 Templates Directory

```text
code-templates/03_cloud_devops/
 ├── aws-cdk/
 │    └── static-site-stack.ts       # TypeScript AWS CDK stack (S3 + CloudFront + ACM + Route53)
 ├── circleci/
 │    └── config.yml                 # Production CI/CD workflow with caching, test, lint & deploy
 ├── terraform/
 │    └── main.tf                    # AWS ECS Fargate & ALB infrastructure module
 └── kubernetes/
      └── deployment.yaml            # Production K8s Deployment with HPA, readiness & liveness probes
```
