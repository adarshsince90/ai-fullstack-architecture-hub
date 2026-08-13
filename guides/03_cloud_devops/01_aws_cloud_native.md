# AWS Cloud-Native Architecture & Serverless Ecosystem

For Senior and Lead Engineers, architecting cloud-native solutions on AWS requires understanding compute tradeoffs, event-driven orchestration, and disaster recovery strategies from first principles.

---

## 1. AWS Compute Spectrum: Lambda vs ECS Fargate vs EKS

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        AWS COMPUTE SPECTRUM                            │
│                                                                        │
│  [ AWS Lambda ]         [ AWS ECS Fargate ]        [ AWS EKS (K8s) ]   │
│  Serverless / Ephemeral Serverless Containers      Managed Kubernetes  │
│  • Event-driven (0-15m) • Long-running HTTP/APIs   • Complex workloads │
│  • Auto-scale to zero   • Microservices / Workers  • Polyglot clusters │
│  • Zero server mgmt     • No EC2 provisioning      • Full K8s ecosystem│
└────────────────────────────────────────────────────────────────────────┘
```

### AWS Lambda Internals & Cold Starts:
When a Lambda function is invoked after inactivity, AWS must:
1. Provision a Firecracker microVM.
2. Download the deployment package / container image.
3. Initialize the runtime (.NET CLR, Node.js).
4. Run method initialization code outside the handler.

```text
Cold Start Execution Timeline:
├── [1. Init Phase] Provision MicroVM ──► Load Runtime ──► Run Static Constructors
│   (300ms - 2,000ms latency hit)
└── [2. Invoke Phase] Execute Handler Function (10ms - 50ms)
```

### Cold Start Mitigation for .NET / Web Applications:
- **Provisioned Concurrency**: Keeps pre-warmed execution environments initialized and ready to respond in double-digit milliseconds.
- **Native AOT (Ahead-of-Time Compilation)** in .NET 8/10: Eliminates JIT compilation at startup, reducing cold starts from ~1,500ms to <150ms.
- **Context Reuse**: Initialize database connection pools (`HttpClient`, `DbContextPool`, Redis multiplexers) **outside** the handler function in static scopes so they persist across warm invocations.

---

## 2. Event-Driven Cloud Messaging: SQS vs SNS vs EventBridge

```text
┌────────────────────────────────────────────────────────────────────────┐
│ 1. AWS SQS (Simple Queue Service) - Point-to-Point Pull Model          │
│    Producer ──► [ SQS Queue (Standard / FIFO) ] ──► Consumer (Worker)  │
├────────────────────────────────────────────────────────────────────────┤
│ 2. AWS SNS (Simple Notification Service) - Pub/Sub Fan-Out Push Model  │
│    Publisher ──► [ SNS Topic ] ──┬──► SQS Queue A (Billing)            │
│                                  ├──► SQS Queue B (Analytics)          │
│                                  └──► Email / SMS Notification         │
├────────────────────────────────────────────────────────────────────────┤
│ 3. AWS EventBridge - Enterprise Event Bus & Schema Registry           │
│    SaaS / Microservices ──► [ Event Bus ] ──► Rules Engine ──► Targets │
└────────────────────────────────────────────────────────────────────────┘
```

### Key Architectural Distinctions:
- **SQS Visibility Timeout**: When a consumer receives a message, it becomes invisible to other consumers for a duration (e.g. 30s). If the worker crashes before deleting the message, it reappears on the queue for redelivery.
- **Dead Letter Queues (DLQ)**: After `maxReceiveCount` consecutive processing failures, messages move to a DLQ for inspection and alarming.
- **EventBridge Content Filtering**: Enables advanced JSON schema filtering at the bus level without requiring Lambda compute to filter irrelevant events.

---

## 3. High Availability & Multi-Region Active-Active Architecture

```text
                                [ User Traffic ]
                                       │
                                       ▼
                   [ Amazon Route 53 (Latency / Geolocation DNS) ]
                                       │
                   ┌───────────────────┴───────────────────┐
                   ▼                                       ▼
      [ Region 1: US-East-1 (Primary) ]       [ Region 2: US-West-2 (Secondary) ]
      ┌──────────────────────────────┐       ┌──────────────────────────────┐
      │ ALB ──► ECS Fargate Tasks    │       │ ALB ──► ECS Fargate Tasks    │
      │        │                     │       │        │                     │
      │        ▼                     │       │        ▼                     │
      │ [ DynamoDB Global Table A ]  │ ◄───► │ [ DynamoDB Global Table B ]  │
      └──────────────────────────────┘ (Sync)└──────────────────────────────┘
```

### High-Scale Data Storage Patterns:
- **Amazon S3**: Multi-part uploads for large files (>100MB), S3 Lifecycle policies (transitioning to Glacier / Deep Archive), S3 Object Lock for WORM compliance.
- **DynamoDB Global Tables**: Multi-Region, multi-master active-active replication with sub-second replication latency and Conflict-Free Replicated Data Types (CRDTs).

---

## 4. Senior & Lead Interview Scenarios

### Q1: How do you choose between Amazon SQS and Apache Kafka (Amazon MSK) in an enterprise design?
**Lead Answer**: 
- **Choose SQS**: When you need simple, zero-maintenance task queues, independent message acknowledgment, automatic Dead Letter Queue handling, and elasticity without capacity provisioning.
- **Choose Kafka (MSK)**: When you need high-throughput event streaming (millions of events/sec), strict ordering guarantees per partition key, event replayability for Event Sourcing, or long-term retention of immutable event logs.

### Q2: What is the "Fan-out" pattern in AWS and why is it preferred over chaining direct HTTP calls?
**Lead Answer**: The Fan-out pattern combines an **SNS Topic** with multiple subscriber **SQS Queues**. When an event occurs (e.g., `OrderPlaced`), the service publishes a single message to SNS. SNS instantly pushes copies to independent SQS queues consumed by Billing, Inventory, and Notification services.
- **Benefits**: Eliminates synchronous cascading HTTP coupling, provides independent scaling and retries for each subscriber, and prevents downstream failures from affecting the primary order placement path.
