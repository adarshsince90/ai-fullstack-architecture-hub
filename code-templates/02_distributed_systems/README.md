# Domain 2 Code Templates: Distributed Systems & Patterns

Production implementations of distributed transaction patterns, outbox event publishers, and resiliency handlers in C# / .NET.

---

## 📂 Templates Directory

```text
code-templates/02_distributed_systems/
 ├── saga-orchestrator/
 │    └── OrderSagaOrchestrator.cs   # State machine for distributed checkouts & compensations
 └── transactional-outbox/
      └── OutboxPublisherWorker.cs   # BackgroundService polling outbox table & publishing to SQS/Kafka
```

### Key Architectural Concepts Implemented
- **Idempotent Outbox Worker**: Queries pending `OutboxMessage` rows in batches, dispatches events with exponential backoff, and marks messages as `ProcessedUtc`.
- **Saga Orchestrator State Machine**: Manages compensations upon downstream microservice failure.
