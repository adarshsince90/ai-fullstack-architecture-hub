# Microservices Decomposition, API Gateways & BFF Architecture

Decomposing monolithic architectures into distributed microservices is one of the most critical responsibilities of a Lead Software Engineer or Systems Architect. Success depends on setting bounded contexts, avoiding distributed monolith anti-patterns, and implementing robust ingress gateways.

---

## 1. Monolith Decomposition Strategies

```text
┌────────────────────────────────────────────────────────┐
│ Legacy Monolithic Enterprise Application               │
│ (Shared SQL Database, Monolithic Process, Tight Coupl.)│
└──────────────────────────┬─────────────────────────────┘
                           │ Strangler Fig Pattern
                           ▼
┌────────────────────────────────────────────────────────┐
│ Routing Proxy / API Gateway (e.g., YARP / Envoy)       │
└──────────────┬──────────────────────────┬──────────────┘
               │ (Old Routes)             │ (Migrated Routes)
               ▼                          ▼
      ┌─────────────────┐       ┌──────────────────┐
      │ Legacy Monolith │       │ New Microservice │
      └─────────────────┘       │ (Independent DB) │
                                └──────────────────┘
```

### 1. Decomposition by Business Capability
- Groups services around enterprise business functions (e.g., *Billing Service*, *Order Fulfillment Service*, *Catalog Service*).
- Directly aligns with domain business units and cross-functional feature teams.

### 2. Decomposition by Subdomain (Domain-Driven Design)
- **Core Domain**: High business differentiation (e.g., algorithmic pricing engine).
- **Supporting Domain**: Custom domain logic complementary to the core (e.g., inventory tracking).
- **Generic Domain**: Off-the-shelf or standard commodity capabilities (e.g., user identity, notifications).

### 3. The Strangler Fig Migration Pattern
Instead of a high-risk "big-bang" rewrite, incrementally replace specific slices of the monolith:
1. **Intercept**: Direct incoming API traffic through an API Gateway (e.g., YARP or Envoy).
2. **Transform**: Implement the targeted capability in a new microservice with its own database.
3. **Shadow / Canary**: Route 5% -> 50% -> 100% of live traffic to the new microservice.
4. **Deprecate**: Decommission the old code path in the legacy monolith.

---

## 2. API Gateway Pattern vs Backend-for-Frontend (BFF)

```text
┌────────────────────────────────────────────────────────────────┐
│ API GATEWAY PATTERN (Single Entry Point for All Clients)       │
│ Web / Mobile / IoT ──► [ Central API Gateway ] ──► Services A,B│
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ BACKEND-FOR-FRONTEND (BFF) PATTERN (Dedicated Gateways)        │
│ Web SPA Clients    ──► [ Web BFF (Aggregates GraphQL/REST) ] ──┐
│ Mobile iOS/Android ──► [ Mobile BFF (Compact Payloads)     ] ──┼──► Services
│ 3rd-Party Partners ──► [ Partner BFF (Strict Rate Limits)  ] ──┘
└────────────────────────────────────────────────────────────────┘
```

### Architectural Comparison
- **API Gateway (e.g., YARP, Kong, Ocelot, AWS API Gateway)**:
  - Centralizes cross-cutting concerns: SSL termination, OAuth2 token validation, rate limiting, and centralized WAF protection.
  - *Risk*: Can become an organizational bottleneck if owned by a single platform team.
- **Backend-for-Frontend (BFF)**:
  - Tailors API responses to specific frontend client consumption models (e.g., stripping heavy desktop fields for mobile networks).
  - Enables frontend teams to own and evolve their backend endpoints independently without inter-team delays.

---

## 3. Database-per-Service vs Shared Database Anti-Pattern

```text
❌ SHARED DATABASE ANTI-PATTERN:
Service A (Catalog) ────┐
Service B (Orders)  ────┼──► [ SINGLE MONOLITHIC DATABASE ]
Service C (Billing) ────┘
* Dangers: Single point of failure, hidden data coupling, schema migration locks.

✅ DATABASE-PER-SERVICE PATTERN:
Service A ──► [ Catalog DB (NoSQL) ]
Service B ──► [ Orders DB (Relational) ]
Service C ──► [ Billing DB (Relational) ]
* Benefits: Complete runtime autonomy, independent schema evolution, zero cross-service lock contention.
```

---

## 4. Distributed Tracing & Observability (OpenTelemetry & W3C Trace Context)

When a single user interaction traverses 5 microservices across asynchronous queues, distributed tracing is essential for root-cause analysis:

```text
User Request (TraceId: 4bf92f3577b34da6a3ce929d0e0e4736)
  │
  ├──► [API Gateway]         (SpanId: 00f067aa0ba902b7)
  │      │
  │      ├──► [Order Service]  (SpanId: 5fb397be34d8b3c2)
  │      │      │ (Publishes event with traceparent header)
  │      │      ▼
  │      └──► [Message Broker (Kafka / SQS)]
  │             │
  │             └──► [Payment Worker] (SpanId: b7ad6b7169203331)
```

- **W3C Trace Context Header**: `traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01`
- **OpenTelemetry in .NET**: Automatically propagates `Activity.Current` across HTTP clients, gRPC calls, and message consumers.

---

## 5. Senior & Lead Interview Scenarios

### Q1: How do you handle distributed queries across services with independent databases without joining tables?
**Lead Answer**: Use the **CQRS and Read-Model Projection** pattern. Services publish Domain Events (e.g., `CustomerNameUpdated`, `ProductPriceChanged`) onto an event bus (Kafka/EventBridge). A dedicated Query Service or BFF consumes these events and updates a denormalized read-optimized view store (e.g., Elasticsearch, Redis, or PostgreSQL read replica). Queries hit this consolidated read model in sub-10ms without cross-service network joins.

### Q2: What is the "Distributed Monolith" anti-pattern and how do you diagnose it?
**Lead Answer**: A distributed monolith has the deployment complexity and operational overhead of microservices combined with the tight coupling of a monolith.
- **Symptoms**:
  1. A change in Service A requires coordinated, simultaneous deployments of Service B and C.
  2. A single user request triggers synchronous cascading HTTP chains 5+ levels deep.
  3. Services share a single database or query each other's internal tables directly.
- **Remedy**: Introduce asynchronous event-driven messaging, enforce clear bounded contexts, and migrate to database-per-service isolation.
