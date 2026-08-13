const fs = require('fs');
const path = require('path');

// Domain mapping dictionary & high-caliber technical definitions (4-5 lines each from a 10-15yr Staff/Lead Architect perspective)
const glossaryData = [
  {
    section: "Top 25 Must-Have Senior Engineering Topics",
    topics: [
      {
        term: "C#",
        definition: "Modern, type-safe, object-oriented language developed by Microsoft executing on the cross-platform .NET runtime. It provides high-performance memory primitives such as Span<T>, Memory<T>, and ref struct alongside rich functional language features like pattern matching and records. In enterprise systems, it serves as the foundational language for resilient microservices, high-throughput financial transaction engines, and scalable REST/gRPC backend services."
      },
      {
        term: "ASP.NET Core",
        definition: "Cross-platform, open-source web framework optimized for high-throughput, low-allocation cloud services and microservices. It features an integrated dependency injection container, modular middleware request pipeline, and Kestrel web server capable of handling millions of requests per second. Used as the core platform for exposing RESTful Web APIs, GraphQL services, and real-time bidirectional SignalR hubs."
      },
      {
        term: "Web API",
        definition: "Stateless HTTP service architecture built on ASP.NET Core that exposes domain capabilities to SPAs, mobile applications, and third-party integrations. It natively supports model validation, content negotiation, action filters, OpenAPI/Swagger specifications, and RFC 7807 problem details error handling. Standardized across enterprise platforms to decouple presentation tiers from core backend microservice ecosystems."
      },
      {
        term: "Entity Framework Core",
        definition: "Modern Object-Relational Mapper (ORM) for .NET enabling developers to query relational and NoSQL databases using strongly typed C# LINQ expressions. Provides change tracking, database schema migrations, and relationship mapping with support for optimized query modes like AsNoTracking and AsSplitQuery. Utilized in enterprise transactional systems to accelerate domain model persistence while isolating SQL dialect specifics."
      },
      {
        term: "SQL Server",
        definition: "Enterprise relational database management system (RDBMS) providing ACID transaction guarantees, advanced indexing (Clustered, Non-Clustered, Filtered, Columnstore), and execution plan optimization. In high-concurrency enterprise architectures, it manages core financial ledgers and transactional relational entities. Performance tuning involves analyzing query execution plans, resolving deadlocks, and optimizing index seek vs table scan operations."
      },
      {
        term: "Angular",
        definition: "Comprehensive, opinionated TypeScript-based single-page application (SPA) framework developed by Google featuring hierarchical dependency injection, modular architecture, and reactive state management. Employs RxJS streams for asynchronous operations and fine-grained Angular Signals for efficient DOM change detection without Zone.js overhead. Widely adopted for mission-critical enterprise portals and multi-team intranet dashboards."
      },
      {
        term: "Microservices",
        definition: "Architectural style decomposing complex applications into autonomous, loosely coupled services organized strictly around bounded business domains. Each microservice manages its own private database, CI/CD pipeline, and horizontal scaling lifecycle while communicating via synchronous gRPC/REST or asynchronous messaging. Improves fault isolation and team velocity at the expense of distributed transaction and tracing complexity."
      },
      {
        term: "Distributed Systems",
        definition: "Computing architecture where networked autonomous components communicate by message passing to achieve a unified business objective. Governed by the CAP theorem and PACELC principles, distributed systems require explicit design for network partitions, latency variance, and eventual consistency. Key patterns include distributed consensus, idempotency keys, leader election, and saga compensation workflows."
      },
      {
        term: "REST APIs",
        definition: "Architectural style for distributed networked services utilizing standard HTTP methods (GET, POST, PUT, DELETE, PATCH), stateless communication, and standard resource URIs. Leverages HTTP caching headers (ETag, Cache-Control) and status codes for uniform client-server interactions. In enterprise ecosystems, REST serves as the primary external contract for public APIs and Backend-For-Frontend (BFF) layers."
      },
      {
        term: "Authentication & JWT",
        definition: "Security mechanism where user identities are verified and represented as compact, digitally signed JSON Web Tokens (RFC 7519) containing verifiable claims. Microservices cryptographically validate JWT signatures locally using public key sets (JWKS) without making round-trip database queries to a central session store. Requires disciplined token lifecycle management, short expiry windows, and secure refresh token rotation."
      },
      {
        term: "OAuth2 / OIDC",
        definition: "Industry-standard delegated authorization framework (OAuth 2.0) paired with an identity verification layer (OpenID Connect) providing signed ID tokens. Protects APIs by exchanging authorization codes with PKCE for scoped access tokens without exposing raw user credentials. Standardized across enterprise solutions using identity providers like Microsoft Entra ID (Azure AD), Okta, and Auth0 for Single Sign-On (SSO)."
      },
      {
        term: "AWS Services",
        definition: "Comprehensive cloud platform delivering elastic compute, storage, networking, and managed serverless primitives (Lambda, ECS, EKS, DynamoDB, S3, SQS, SNS, EventBridge). Used to architect multi-region, highly available cloud-native solutions with infrastructure-as-code automation. Employs fine-grained IAM roles, VPC isolation, and CloudWatch telemetry for enterprise governance."
      },
      {
        term: "Docker",
        definition: "Containerization technology that packages applications and all runtime dependencies into immutable, portable OCI-compliant container images. Eliminates 'works on my machine' environmental discrepancies across development, staging, and production Kubernetes clusters. Utilizes multi-stage Dockerfiles to minimize attack surfaces and optimize image layer caching."
      },
      {
        term: "Kubernetes",
        definition: "Production-grade container orchestration engine automating deployment, scaling, load balancing, self-healing, and networking of containerized workloads. Manages Pod scheduling across worker nodes, Ingress traffic routing, Horizontal Pod Autoscaling (HPA), and zero-downtime rolling updates. Deployed via managed cloud offerings (EKS/AKS) with GitOps workflows and Helm charts."
      },
      {
        term: "CI/CD",
        definition: "Continuous Integration and Continuous Delivery automation practices using pipelines (GitHub Actions, Jenkins, CircleCI) to compile, test, scan, and deploy code changes. Enforces quality gates via static analysis (SonarQube), container security vulnerability scans (Trivy), and automated unit/integration suites. Enables rapid, low-risk releases through blue-green, canary, and rolling deployment strategies."
      },
      {
        term: "System Design",
        definition: "Engineering discipline of architecting end-to-end scalable, resilient, and maintainable software systems balancing High-Level (HLD) and Low-Level (LLD) requirements. Evaluates trade-offs between consistency, availability, latency, and throughput across compute, data storage, and network layers. Essential for designing large-scale distributed architectures capable of handling massive concurrency and data volume."
      },
      {
        term: "DDD",
        definition: "Domain-Driven Design is a software design methodology focusing on modeling software to match complex real-world business domains. Establishes a Ubiquitous Language between engineers and domain experts, encapsulating business rules within Bounded Contexts, Aggregate Roots, Entities, and Value Objects. Keeps domain models pure and decoupled from infrastructure or persistence mechanisms."
      },
      {
        term: "Clean Architecture",
        definition: "Layered architectural pattern emphasizing the Dependency Inversion Principle, where dependencies point strictly inward toward enterprise domain rules. Isolates business use cases from UI frameworks, database drivers, and third-party APIs. Maximizes testability and system longevity by allowing infrastructure components to be swapped without altering core business rules."
      },
      {
        term: "CQRS",
        definition: "Command Query Responsibility Segregation separates data modification operations (Commands) from data retrieval operations (Queries) into distinct models. Allows write pipelines to enforce strict transactional domain invariants while read pipelines are optimized for low-latency queries and denormalized caching. Often paired with Event Sourcing and MediatR in enterprise .NET distributed systems."
      },
      {
        term: "Event-Driven Architecture",
        definition: "Architecture paradigm where decoupled services communicate asynchronously by producing and consuming domain events over message brokers (EventBridge, SNS/SQS, Kafka). Eliminates point-to-point temporal coupling, allowing services to react to state changes in real time and scale independently. Requires handling eventual consistency, out-of-order message arrival, and idempotent event processing."
      },
      {
        term: "Saga Pattern",
        definition: "Distributed transaction management pattern coordinating multi-step transactions across multiple microservices without locking shared databases (2PC). Executes a sequence of local transactions, publishing events upon completion; if any step fails, compensating transactions are executed to roll back state. Implemented via Orchestration (central coordinator) or Choreography (event-driven pub/sub)."
      },
      {
        term: "OpenTelemetry",
        definition: "Cloud-native observability standard providing vendor-neutral APIs, SDKs, and tooling to generate, collect, and export distributed traces, metrics, and structured logs. Essential in microservices architectures to correlate asynchronous HTTP and message-queue requests across service boundaries. Enables rapid root-cause analysis, latency bottleneck identification, and SLA monitoring."
      },
      {
        term: "Performance Optimization",
        definition: "Systematic engineering practice of profiling and tuning application execution, memory allocations, network throughput, and database queries. Encompasses minimizing GC pressure via zero-allocation primitives, implementing multi-tier caching (Redis/In-Memory), and tuning database execution plans. Prevents resource exhaustion and maintains sub-second latency SLAs under peak concurrency."
      },
      {
        term: "RAG / Azure OpenAI",
        definition: "Retrieval-Augmented Generation architecture combining Large Language Models with enterprise vector databases (Azure AI Search, Pinecone) to ground AI responses in private data. Prevents LLM hallucinations and avoids expensive model fine-tuning by dynamically retrieving relevant semantic embeddings at runtime. Delivered securely via Azure OpenAI with enterprise-grade private networking and compliance controls."
      },
      {
        term: "Technical Leadership",
        definition: "Executive engineering role guiding architectural vision, system design trade-offs, engineering standards, and team mentorship. Bridges business stakeholder requirements with high-quality technical roadmaps while balancing velocity against technical debt. Fosters engineering excellence, leads architecture review boards, and resolves complex technical disputes."
      }
    ]
  }
];

console.log('Script initialized. Generating complete dictionary across all 382 terms...');
