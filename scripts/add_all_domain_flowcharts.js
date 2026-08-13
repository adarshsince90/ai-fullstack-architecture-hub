const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'docs', 'profile', 'Definitions.md');
let content = fs.readFileSync(filePath, 'utf-8');

const newFlowcharts = {
  '📌 MICROSERVICES': `> **Microservices Architectural Topology & Resilience Flow**:
> 📖 **Deep Guides**: [Microservices Architecture](guides/02_distributed_systems/01_microservices_architecture.md) | [Saga & Outbox Patterns](guides/02_distributed_systems/03_saga_outbox_resiliency.md)
> \`\`\`text
> [Client Request] ──► [API Gateway / Service Mesh]
>                             │
>                             ▼
>   ┌─────────────────────────┼─────────────────────────┐
>   ▼                         ▼                         ▼
> [Order Service]      [Payment Service]       [Inventory Service]
> (Private DB)         (Private DB)            (Private DB)
>   │                         │                         │
>   └─────────────────────────┼─────────────────────────┘
>                             ▼
>         [Event Bus: Kafka / RabbitMQ / SQS]
> \`\`\``,

  '📌 ARCHITECTURE & DESIGN': `> **Domain-Driven & Clean Architecture Execution Flow**:
> 📖 **Deep Guides**: [DDD & CQRS Event Sourcing](guides/02_distributed_systems/02_ddd_cqrs_event_sourcing.md) | [HLD & LLD Framework](guides/02_distributed_systems/04_hld_lld_framework.md)
> \`\`\`text
> [Domain Requirements] ──► [DDD Bounded Contexts]
>                                  │
>                                  ▼
>                     [Clean / Hexagonal Architecture]
>                     (Domain Models ◄─ Use Cases ◄─ Infra)
>                                  │
>                                  ▼
>                     [CQRS: Command / Query Separation]
>                                  │
>                                  ▼
>                     [Event Sourcing & Audit Ledger]
> \`\`\``,

  '📌 SYSTEM DESIGN (HLD/LLD)': `> **High-Level Distributed System Design Topology**:
> 📖 **Deep Guides**: [HLD & LLD Architecture Framework](guides/02_distributed_systems/04_hld_lld_framework.md) | [AWS Cloud Native](guides/03_cloud_devops/01_aws_cloud_native.md)
> \`\`\`text
> [User Clients] ──► [Global CDN / DNS] ──► [Load Balancer] ──► [API Gateway]
>                                                                    │
>                                                                    ▼
>                                                       [Stateless Web/App Services]
>                                                                    │
>                                   ┌────────────────────────────────┴────────────────────────────────┐
>                                   ▼                                                                 ▼
>                      [Primary Relational DB: SQL/Postgres]                             [Distributed Cache: Redis]
>                                   │ (Transactional Outbox)                                          │
>                                   ▼                                                                 ▼
>                      [Search Engine: Elastic / Vector DB]                              [Async Queue: SQS / Kafka]
> \`\`\``,

  '📌 MESSAGING & INTEGRATION': `> **Asynchronous Messaging & Event-Driven Integration Topology**:
> 📖 **Deep Guides**: [Distributed Saga & Resiliency](guides/02_distributed_systems/03_saga_outbox_resiliency.md) | [Microservices Architecture](guides/02_distributed_systems/01_microservices_architecture.md)
> \`\`\`text
> [Publisher Service] ──► [Message Exchange / Event Bus] ──► [Topic Queues]
>                                  │                               │
>                                  ▼                               ▼
>                         [Dead Letter Queue]             [Consumer Microservices]
>                         (Idempotent Retry)              (Transactional Outbox DB)
> \`\`\``,

  '📌 AWS': `> **AWS Enterprise Cloud Infrastructure Architecture**:
> 📖 **Deep Guides**: [AWS Cloud Native Architecture](guides/03_cloud_devops/01_aws_cloud_native.md) | [DynamoDB Single-Table Design](guides/04_security_database/04_dynamodb_data_modeling.md)
> \`\`\`text
> [Route53 / CloudFront CDN] ──► [AWS WAF] ──► [API Gateway]
>                                                  │
>                       ┌──────────────────────────┴──────────────────────────┐
>                       ▼                                                     ▼
>             [Container Stack: ECS / EKS]                           [Serverless: AWS Lambda]
>                       │                                                     │
>                       ▼                                                     ▼
>             [Managed Relational: RDS Postgres]                     [NoSQL: DynamoDB Single-Table]
> \`\`\``,

  '📌 AZURE': `> **Azure Enterprise Cloud Systems Flow**:
> 📖 **Deep Guides**: [Azure Enterprise Architecture](guides/03_cloud_devops/02_azure_enterprise.md) | [RAG & Azure OpenAI](guides/06_ai_engineering/01_rag_vector_search.md)
> \`\`\`text
> [Azure Front Door / Traffic Manager] ──► [Azure WAF] ──► [API Management (APIM)]
>                                                                 │
>                                        ┌────────────────────────┴────────────────────────┐
>                                        ▼                                                 ▼
>                              [Azure App Services / AKS]                       [Azure Functions]
>                                        │                                                 │
>                                        ▼                                                 ▼
>                              [Azure SQL / Cosmos DB]                          [Azure OpenAI & Vector Search]
> \`\`\``,

  '📌 DEVOPS': `> **DevOps Containerization & CI/CD Pipeline Automation**:
> 📖 **Deep Guides**: [Docker & Kubernetes](guides/03_cloud_devops/03_docker_kubernetes.md) | [Terraform & CI/CD Pipelines](guides/03_cloud_devops/04_terraform_cicd_pipelines.md)
> \`\`\`text
> [Git Commit / PR] ──► [CI/CD Pipeline (GitHub Actions)] ──► [Static Code & Security Scan]
>                                                                     │
>                                                                     ▼
>                                                        [Terraform Infrastructure as Code]
>                                                                     │
>                                                                     ▼
>                                                        [Docker Build & K8s Helm Deployment]
> \`\`\``,

  '📌 OBSERVABILITY': `> **Cloud-Native OpenTelemetry Observability Topology**:
> 📖 **Deep Guides**: [HLD & LLD Architecture Framework](guides/02_distributed_systems/04_hld_lld_framework.md) | [ASP.NET Core Web API Middleware](guides/01_dotnet_backend/02_aspnetcore_webapi.md)
> \`\`\`text
> [Microservice Apps (Traces / Metrics / Logs)] ──► [OpenTelemetry Collector Pipeline]
>                                                             │
>                                  ┌──────────────────────────┼──────────────────────────┐
>                                  ▼                          ▼                          ▼
>                         [Distributed Tracing]       [Metrics Dashboard]       [Centralized Log Store]
>                         (Jaeger / Zipkin)           (Prometheus / Grafana)    (Elastic / Loki)
> \`\`\``,

  '📌 SECURITY': `> **Enterprise Defense-in-Depth Security Flow**:
> 📖 **Deep Guides**: [OAuth2 PKCE & JWT Lifecycle](guides/04_security_database/01_oauth2_oidc_jwt.md) | [OWASP Top 10 Defenses](guides/04_security_database/02_owasp_secure_coding.md)
> \`\`\`text
> [Client Request] ──► [HTTPS TLS 1.3 Encryption] ──► [WAF (OWASP Input Sanitization)]
>                                                            │
>                                                            ▼
>                                                [OAuth2 / OIDC Token Validation]
>                                                            │ (Stateless JWT Scope Claims)
>                                                            ▼
>                                                [RBAC / ABAC Authorizing & Secret Vault]
> \`\`\``
};

Object.entries(newFlowcharts).forEach(([sectionHeader, flowchartText]) => {
  const headerMarker = `## ${sectionHeader}`;
  const headerIdx = content.indexOf(headerMarker);
  if (headerIdx !== -1) {
    // Check if flowchart already exists right after header
    const nextLineIdx = content.indexOf('\n', headerIdx);
    const textAfterHeader = content.substring(nextLineIdx, nextLineIdx + 100);
    if (!textAfterHeader.includes('> **')) {
      // Insert flowchart right below section header
      const replacement = `${headerMarker}\n\n${flowchartText}\n`;
      content = content.replace(headerMarker, replacement);
      console.log(`✅ Added flowchart for section: ${sectionHeader}`);
    }
  }
});

fs.writeFileSync(filePath, content, 'utf-8');
console.log('✅ Finished adding execution flow diagrams to all domain sections');
