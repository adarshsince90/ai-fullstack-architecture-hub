# Saga Pattern, Outbox Pattern & Distributed Resiliency

In distributed systems and microservices architectures, data is partitioned across multiple distinct databases. This guide covers how to maintain data consistency without blocking locks and how to guarantee fault-tolerant resiliency.

---

## 1. The Dual-Write Problem & Transactional Outbox Pattern

When an application needs to update a database AND publish an event to a message broker (RabbitMQ, AWS SQS/SNS, Kafka), doing this sequentially creates a critical failure window:

```text
❌ Vulnerable Dual-Write:
1. Save to DB (Success)
2. Network timeout / Broker crashes
3. Event never published ──► Downstream services out of sync!
```

### The Transactional Outbox Solution
Write both the business entity change AND the outgoing event into the **same local database transaction**.

```text
┌────────────────────────────────────────────────────────┐
│ Relational Database (e.g. SQL Server)                  │
│  ┌───────────────────────┐   ┌───────────────────────┐ │
│  │ Orders Table          │   │ OutboxMessages Table  │ │
│  │ (State: Created)      │   │ (Event: OrderCreated) │ │
│  └───────────────────────┘   └───────────────────────┘ │
│           ▲                              ▲             │
│           └────────── Same DB ───────────┘             │
│                      Transaction                       │
└───────────────────────────┬────────────────────────────┘
                            │
              ┌─────────────▼─────────────┐
              │ Background Outbox Worker  │ (Polls or uses CDC / Change Data Capture)
              └─────────────┬─────────────┘
                            │
                            ▼
              ┌───────────────────────────┐
              │ Message Bus (SQS / Kafka) │
              └───────────────────────────┘
```

---

## 2. Distributed Transactions: The Saga Pattern

Since Two-Phase Commit (2PC) creates heavy locks and single points of failure across services, distributed systems rely on **Sagas**—a sequence of local transactions where each step publishes an event or message, and failures trigger **compensating transactions** to rollback previous state.

### Orchestration vs Choreography

| Feature | Choreography (Event-Driven) | Orchestration (Central Coordinator) |
| :--- | :--- | :--- |
| **Mechanics** | Services react to events from other services autonomously. | A central Saga Orchestrator explicitly sends command messages to each participant. |
| **Best For** | Simple workflows with 2–4 services. | Complex, long-running enterprise workflows (e.g. Order fulfillment, Payments). |
| **Coupling** | Loosely coupled, but can become hard to trace (event spaghetti). | Explicitly managed state machine; easy to observe, audit, and debug. |

```text
Saga Orchestration Flow:
┌───────────────────────┐
│   Order Orchestrator  │
└───────────┬───────────┘
            │ 1. ProcessPayment Command
            ▼
┌───────────────────────┐
│    Payment Service    │ ──► Success
└───────────┬───────────┘
            │ 2. ReserveInventory Command
            ▼
┌───────────────────────┐
│   Inventory Service   │ ──► ❌ Out of Stock! (Failure)
└───────────┬───────────┘
            │
            ▼ 3. RefundPayment Compensating Command
┌───────────────────────┐
│    Payment Service    │ ──► Money Refunded to User
└───────────────────────┘
```

---

## 3. Message Broker Landscape: Apache Kafka vs RabbitMQ vs AWS SQS/SNS

In Senior & Lead System Design interviews, choosing between **Message Queues** and **Distributed Event Streaming Logs** is a primary architectural evaluation:

| Dimension | Apache Kafka | RabbitMQ | AWS SQS + SNS |
| :--- | :--- | :--- | :--- |
| **Model** | Append-only distributed commit log | AMQP Message Broker (Push to Consumer) | Managed Cloud Queue (Pull) + Pub/Sub (Push) |
| **Message Consumption** | Pull-based (Consumer tracks partition offset) | Push-based (Broker tracks acknowledgment) | Pull-based (SQS Long Polling, Visibility Timeout) |
| **Throughput & Latency** | Ultra-high throughput (millions/sec), low latency | Moderate-to-high throughput, sub-millisecond | Elastic cloud scale (virtually unlimited scaling) |
| **Replayability** | **Yes**: Consumers can replay events from any offset | **No**: Messages deleted after acknowledgment | **No**: Deleted after acknowledgment (or sent to DLQ) |
| **Ordering Guarantees** | Strict total ordering **per partition key** | Total ordering per FIFO queue | SQS FIFO (strict order per MessageGroupId) |
| **Ideal Enterprise Use Case** | Event Sourcing, High-volume telemetry, Audit logs | Complex routing (Topic/Header exchanges), Task queues | Zero-maintenance AWS cloud-native serverless workflows |

---

## 4. Resiliency Patterns (Polly in .NET)

Microservices must be designed for failure:
1. **Circuit Breaker**: Detects repeated downstream failures and opens the circuit immediately to prevent cascading thread exhaustion.
2. **Exponential Backoff with Jitter**: Avoids "thundering herd" problems by adding randomized jitter delays between retries.
3. **Idempotency**: Using UUID idempotency keys ensures that if an identical message is retried, it is processed exactly once without double charging or duplicate record creation.
