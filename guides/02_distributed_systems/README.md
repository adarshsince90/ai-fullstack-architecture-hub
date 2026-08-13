# Domain 2: Distributed Systems & System Design

Welcome to the **Distributed Systems & System Design** domain guide. This module provides senior and lead level frameworks for architecting resilient microservices, Domain-Driven Design (DDD), CQRS, event-driven architectures, distributed transaction patterns (Saga & Outbox), and scalable High-Level & Low-Level Design (HLD/LLD).

---

## 🗺️ Domain Mind Map & Subtopics

```text
Distributed Systems & System Design
 ├── 1. Microservices Decomposition & API Gateways (Strangler Fig, BFF, Reverse Proxies)
 ├── 2. Domain-Driven Design (DDD), CQRS & Event Sourcing (Aggregates, Bounded Contexts)
 ├── 3. Saga Pattern, Outbox & Resiliency (Orchestration vs Choreography, Idempotency)
 └── 4. Senior System Design Framework (HLD: Scalability, Caching, Sharding, Rate Limiting)
```

---

## 📚 Detailed Guides

1. [01_microservices_decomposition.md](./guides/02_distributed_systems/01_microservices_decomposition.md)
   - Decomposition strategies: By Business Capability vs Subdomain.
   - API Gateway patterns (Ocelot, YARP, AWS API Gateway, Azure APIM) and Backend-For-Frontend (BFF).

2. [02_ddd_cqrs_event_sourcing.md](./guides/02_distributed_systems/02_ddd_cqrs_event_sourcing.md)
   - Strategic vs Tactical DDD: Bounded Contexts, Aggregates, Entities, Value Objects, Domain Events.
   - Command Query Responsibility Segregation (CQRS) with MediatR in .NET.

3. [03_saga_outbox_resiliency.md](./guides/02_distributed_systems/03_saga_outbox_resiliency.md)
   - Distributed transactions: Dual-write problem and why 2PC (Two-Phase Commit) does not scale.
   - Transactional Outbox Pattern with CDC (Debezium) or polling worker.
   - Saga Pattern: Orchestration vs Choreography with compensating actions.
   - Resiliency patterns using Polly: Circuit Breaker, Exponential Backoff with Jitter, Bulkhead Isolation.

4. [04_hld_lld_framework.md](./guides/02_distributed_systems/04_hld_lld_framework.md)
   - Senior 45-minute HLD interview framework: Requirements -> Estimation -> High-level API/DB -> Deep Dive Bottlenecks.
   - Caching strategies: Cache-Aside, Write-Through, Write-Behind, Eviction (LRU/LFU).
   - Database partitioning: Vertical vs Horizontal Sharding, Consistent Hashing.

---

## ⚡ Interactive Tools & Code Templates
- [Interactive Saga & Circuit Breaker Simulator](./interactive/02_distributed_systems/distributed_saga_simulator.html)
- [Distributed Patterns Code Templates](./code-templates/02_distributed_systems/)
