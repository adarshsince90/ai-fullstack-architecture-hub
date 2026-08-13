# 🚀 AI Full-Stack Architecture Hub

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-Zero-success.svg)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![GitHub Pages Ready](https://img.shields.io/badge/Deployment-GitHub%20Pages-blueviolet.svg)](https://adarshsince90.github.io/ai-fullstack-architecture-hub/)

> An interactive, production-grade knowledge base & visual simulation system for **Senior Full-Stack Engineers, Lead Software Engineers, and Systems Architects** (10+ years depth across .NET 8/10, Cloud Native AWS/Azure, Distributed Systems, Modern Frontend, and AI Enablement).

---

## 🧭 Live Interactive Hub & Architecture

Access the interactive dashboard containing the **Master Mind Map**, **Quick Recap Checklist (292 Terms)**, and **9 Visual Playgrounds**:
https://adarshsince90.github.io/ai-fullstack-architecture-hub/

```bash
# Clone the repository
git clone https://github.com/adarshsince90/ai-fullstack-architecture-hub.git
cd ai-fullstack-architecture-hub

# Run static dev server (or open index.html directly in any browser)
npx serve .
```

Navigate to `http://localhost:3000` to interact with:
- 🗺️ **Master Mind Map**: Dynamic architectural tree spanning all 6 engineering domains.
- ⚡ **Quick Recap Checklist**: Interactive 292-term knowledge base with state persistence in `localStorage`.
- 📖 **Embedded Guide Viewer**: Read markdown guides inside the app with dynamic breadcrumb navigation.
- 🎨 **9 Visual Simulators**: Interactive step-by-step visualizers for event loop, fibers, sagas, OAuth2 PKCE, and RAG vector search.
- 🤖 **BYOK AI Study Assistant**: Bring Your Own Key client-side AI tutor (OpenAI / Gemini direct browser REST API calls).

---

## 🗺️ Master Domain Pillars (24 In-Depth Guides)

### 1. 🧠 [Backend & .NET Core](./guides/01_dotnet_backend/README.md)
- **C# 12/13 Runtime Internals**: CLR memory management, GC generations (Gen 0/1/2, LOH, POH), `Span<T>`, `Memory<T>`, RyuJIT.
- **ASP.NET Core Architecture**: Kestrel web server, middleware chain execution, DI lifetimes & captive dependency detection.
- **EF Core & Database Performance**: Split queries (`AsSplitQuery`), compiled queries, execution plan alignment, N+1 prevention.
- **Async & Concurrency**: Async state machines, ThreadPool starvation mitigation, `System.Threading.Channels` pipelines.
- **Real-Time RPC**: gRPC Protocol Buffers & HTTP/2 streaming vs SignalR WebSockets & Redis backplane.

### 2. 🏗️ [Distributed Systems & System Design](./guides/02_distributed_systems/README.md)
- **Microservices & Decomposition**: Domain decomposition heuristics, Strangler Fig pattern, API Gateways, BFF architecture.
- **DDD, CQRS & Event Sourcing**: Bounded contexts, aggregates, command-query separation, event store immutability.
- **Saga Pattern & Resiliency**: Transactional Outbox, Saga orchestrator vs choreography, Kafka vs RabbitMQ, Polly retries & circuit breakers.
- **HLD & LLD Framework**: Scalability math, database sharding, rate-limiting algorithms (Token Bucket/Leaky Bucket), CDN caching strategies.

### 3. ☁️ [Cloud Platforms & DevOps](./guides/03_cloud_devops/README.md)
- **AWS Cloud Native**: AWS Lambda, ECS Fargate, EKS, DynamoDB single-table modeling, S3, SQS/SNS fanout, EventBridge.
- **Azure Enterprise Architecture**: Azure App Services, Azure Functions, Cosmos DB, Key Vault & Managed Identity RBAC.
- **Docker & Kubernetes**: Multi-stage Docker builds, Kubernetes Pod/Deployment/Service primitives, Ingress controllers & Helm charts.
- **Terraform IaC & CI/CD**: Modular Infrastructure as Code, remote state locking, CI/CD security quality gates (SonarQube/Trivy).

### 4. 🔐 [Security & Data Engineering](./guides/04_security_database/README.md)
- **OAuth 2.0 & Identity**: Grant types (PKCE, Client Credentials), OpenID Connect (OIDC), JWT claim validation & key rotation.
- **OWASP Secure Coding**: Enterprise mitigations for BOLA, SQL Injection, SSRF, CSRF, and Zero-Trust secret management.
- **SQL Server Index & Query Tuning**: Execution plan operator analysis, clustered vs non-clustered indexes, DMV query diagnostic scripts.
- **NoSQL Data Modeling**: DynamoDB single-table design, PK/SK composite key strategies, GSI access pattern optimization.

### 5. 🎨 [Frontend Engineering](./guides/05_frontend_engineering/README.md)
- **Web Foundations & Performance**: HTML5 semantic accessibility, CSS Grid/Flexbox layouts, Core Web Vitals (LCP, INP, CLS).
- **Browser Rendering Mechanics**: Critical Rendering Path, DOM/CSSOM construction, Layout/Reflow vs Repaint vs Compositing.
- **JavaScript Engine Internals**: V8 execution context, lexical scope closures, Event Loop phases & microtask queue priority.
- **TypeScript Advanced Type System**: Generics, Mapped & Conditional types, `infer` keyword, discriminated unions.
- **Angular & Signals**: Standalone component architecture, RxJS streams vs fine-grained Signals reactivity primitives.
- **React Fiber & State**: Fiber node 2-phase reconciliation tree, Virtual DOM diffing, Redux Toolkit (RTK) event-sourcing.

### 6. 🤖 [AI Enablement & Modern SDLC](./guides/06_ai_engineering/README.md)
- **RAG & Vector Search**: Retrieval-Augmented Generation architecture, text embeddings, Cosine & HNSW vector indices.
- **Azure OpenAI & Semantic Kernel**: Enterprise LLM integration, Microsoft Semantic Kernel SDK native plugins in .NET.
- **AI-Assisted Engineering**: GitHub Copilot prompt engineering, automated unit test generation, security vulnerability triage workflows.

---

## ⚡ Interactive Engineering Simulators

The repository features 9 standalone client-side visual tools designed to build deep mental models:

| Playground | Focus Domain | Visual Demonstration |
|---|---|---|
| 🧠 **ASP.NET Core DI & Pipeline** | Backend | Captive dependency detection & middleware order |
| ⚡ **Distributed Saga Orchestrator** | Distributed Systems | Multi-service transactions & compensating actions |
| 🔐 **OAuth 2.0 PKCE & JWT** | Security | Authorization code exchange & JWT claim decoder |
| 🔄 **Browser Event Loop** | Frontend | Call stack, Microtask queue & Macrotask execution |
| ⚛️ **React Fiber Reconciliation** | Frontend | 2-Phase reconciliation tree & DOM diffing |
| 🅰️ **Angular Signals vs React VDOM** | Frontend | Fine-grained dependency tracking vs tree reconciliation |
| 📦 **Redux Toolkit State Flow** | Frontend | RTK action dispatch, Immer draft mutations & state snapshots |
| ⚙️ **esbuild Transpile Pipeline** | Build Tooling | AST generation, transpilation & bundle minification |
| 🤖 **RAG Vector Search Pipeline** | AI Engineering | Document chunking, vector embeddings & Cosine similarity ranking |

---

## 📁 Repository Structure

```text
├── index.html                               # Master Dashboard Hub & Mind Map UI
├── styles.css                               # Master stylesheet (theme, mind map, cards)
├── app.js                                   # Mind map rendering logic & breadcrumb router
├── serve.json                               # Production static server configuration
├── LICENSE                                  # MIT Open Source License
│
├── docs/
│   ├── mindmap_schema.json                  # Dynamic JSON schema for Mind Map nodes
│   ├── search_index.json                    # Full-text topic search index
│   └── definitions_schema.json              # 292-term Knowledge Base schema
│
├── guides/                                  # 24 Structured Study Guides by Domain
│   ├── 01_dotnet_backend/
│   ├── 02_distributed_systems/
│   ├── 03_cloud_devops/
│   ├── 04_security_database/
│   ├── 05_frontend_engineering/
│   └── 06_ai_engineering/
│
├── code-templates/                          # Production Code & Architectural Patterns
│   ├── 01_dotnet_backend/                   # Clean Architecture Web API templates
│   ├── 02_distributed_systems/              # Saga Orchestrator & Outbox Worker patterns
│   ├── 03_cloud_devops/                     # AWS CDK & CircleCI pipelines
│   ├── 04_security_database/                # JWT Auth & SQL Server tuning scripts
│   ├── 05_frontend_engineering/             # Build configs & React/Angular state templates
│   └── 06_ai_engineering/                   # RAG pipelines & Semantic Kernel plugins
│
└── interactive/                             # 9 Visual Interactive Simulators
    ├── 01_dotnet_backend/                   # .NET DI Captive Dependency Visualizer
    ├── 02_distributed_systems/              # Distributed Saga & Resiliency Visualizer
    ├── 03_cloud_devops/                     # Deployment & Autoscaling Simulators
    ├── 04_security_database/                # OAuth2 PKCE & JWT Visualizer
    ├── 05_frontend_engineering/             # Event Loop, Fiber, Signals & Redux Simulators
    └── 06_ai_engineering/                   # RAG Vector Search Simulator
```

---

## 🌐 Deployment (GitHub Pages)

https://adarshsince90.github.io/ai-fullstack-architecture-hub/

This repository is built with **zero external framework dependencies** (pure vanilla HTML5, CSS3, and modern ES6 JavaScript). It deploys natively to GitHub Pages in seconds:

1. Fork or push this repository to GitHub.
2. Navigate to **Settings → Pages**.
3. Select **Source: Deploy from a branch** → `main` branch / `root`.
4. Your interactive prep hub will be live at `https://<your-username>.github.io/<repo-name>/`.

---

## 🤝 Contributing

Contributions, topic additions, and simulator enhancements are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before submitting a Pull Request.

---

## 📜 License

This project is licensed under the [MIT License](./LICENSE).
